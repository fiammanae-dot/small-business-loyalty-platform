import "server-only";

import { Prisma, type EngagementEventType, type OutreachStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMessageTemplate, renderEngagementMessage } from "@/lib/engagement";
import {
  DEFAULT_ENABLED_EVENTS,
  DEFAULT_QUIET_DAYS,
  eventPriority,
  isQuiet,
  quietUntil,
  renderCampaignMessage,
  segmentWindow,
  whatsAppLink,
  type CampaignSegment,
} from "@/lib/outreach-rules";

export { OUTREACH_EVENTS, CAMPAIGN_SEGMENTS, eventLabel, segmentLabel, whatsAppLink } from "@/lib/outreach-rules";

/**
 * Manual WhatsApp outreach. The nightly engagement sweep raises events
 * (birthday, quiet for 30/60/90 days, reward ready...). This module turns the
 * open ones into a short "contact today" list for the owner or a branch
 * manager, builds the WhatsApp link with the message filled in, and logs what
 * was sent so a customer is left alone for the quiet period afterwards.
 *
 * Only customers who agreed to marketing are ever listed.
 */

export type OutreachScope = { businessId: number; branchId?: number | null };

export type OutreachSettings = { enabledEvents: EngagementEventType[]; quietDays: number };

export async function getOutreachSettings(businessId: number): Promise<OutreachSettings> {
  const row = await prisma.businessOutreachSettings.findUnique({ where: { businessId } });
  return row ? { enabledEvents: row.enabledEvents, quietDays: row.quietDays } : { enabledEvents: DEFAULT_ENABLED_EVENTS, quietDays: DEFAULT_QUIET_DAYS };
}

export async function saveOutreachSettings(businessId: number, data: OutreachSettings) {
  await prisma.businessOutreachSettings.upsert({ where: { businessId }, create: { businessId, ...data }, update: data });
}

const customerSelect = {
  id: true,
  uuid: true,
  firstName: true,
  lastName: true,
  phone: true,
  currentTier: true,
  createdBranchId: true,
} satisfies Prisma.BusinessCustomerMembershipSelect;

export type OutreachItem = {
  eventUuid: string;
  eventId: number;
  eventType: EngagementEventType;
  eventDate: Date;
  customer: { id: number; uuid: string; name: string; phone: string; tier: string | null };
  message: string;
  link: string | null;
  otherOpenEvents: EngagementEventType[];
};

export type OutreachInbox = {
  items: OutreachItem[];
  /** Customers hidden by the quiet rule, so the owner knows the list is not everyone. */
  quietCount: number;
  countsByType: Partial<Record<EngagementEventType, number>>;
  settings: OutreachSettings;
};

/** The customers to contact today, one row per customer (their most important open event first). */
export async function getOutreachInbox(scope: OutreachScope, now = new Date()): Promise<OutreachInbox> {
  const settings = await getOutreachSettings(scope.businessId);
  if (settings.enabledEvents.length === 0) return { items: [], quietCount: 0, countsByType: {}, settings };

  const business = await prisma.business.findUnique({ where: { id: scope.businessId }, select: { name: true } });
  const events = await prisma.engagementEvent.findMany({
    where: {
      businessId: scope.businessId,
      status: "ACTIVE",
      eventType: { in: settings.enabledEvents },
      outreachMessage: null,
      customer: {
        status: "ACTIVE",
        marketingConsent: true,
        ...(scope.branchId ? { createdBranchId: scope.branchId } : {}),
      },
    },
    orderBy: { eventDate: "desc" },
    take: 500,
    select: { id: true, uuid: true, eventType: true, eventDate: true, metadata: true, customer: { select: customerSelect } },
  });
  if (events.length === 0) return { items: [], quietCount: 0, countsByType: {}, settings };

  // Last message per customer (sent or skipped both start the quiet period).
  const customerIds = Array.from(new Set(events.map((event) => event.customer.id)));
  const lastMessages = await prisma.outreachMessage.groupBy({
    by: ["membershipId"],
    where: { businessId: scope.businessId, membershipId: { in: customerIds } },
    _max: { createdAt: true },
  });
  const lastContact = new Map(lastMessages.map((row) => [row.membershipId, row._max.createdAt]));

  // One row per customer: the highest-priority open event, the rest noted.
  const byCustomer = new Map<number, typeof events>();
  for (const event of events) {
    const list = byCustomer.get(event.customer.id) ?? [];
    list.push(event);
    byCustomer.set(event.customer.id, list);
  }

  const items: OutreachItem[] = [];
  let quietCount = 0;
  const countsByType: Partial<Record<EngagementEventType, number>> = {};
  for (const list of byCustomer.values()) {
    list.sort((a, b) => eventPriority(a.eventType) - eventPriority(b.eventType) || b.eventDate.getTime() - a.eventDate.getTime());
    const primary = list[0];
    if (isQuiet(lastContact.get(primary.customer.id), now, settings.quietDays)) {
      quietCount += 1;
      continue;
    }
    const customerName = `${primary.customer.firstName} ${primary.customer.lastName ?? ""}`.trim();
    const template = await getMessageTemplate(scope.businessId, primary.eventType);
    const message = renderEngagementMessage(template.message, primary.metadata, customerName, business?.name ?? "");
    countsByType[primary.eventType] = (countsByType[primary.eventType] ?? 0) + 1;
    items.push({
      eventUuid: primary.uuid,
      eventId: primary.id,
      eventType: primary.eventType,
      eventDate: primary.eventDate,
      customer: { id: primary.customer.id, uuid: primary.customer.uuid, name: customerName, phone: primary.customer.phone, tier: primary.customer.currentTier },
      message,
      link: whatsAppLink(primary.customer.phone, message),
      otherOpenEvents: list.slice(1).map((event) => event.eventType),
    });
  }
  items.sort((a, b) => eventPriority(a.eventType) - eventPriority(b.eventType) || b.eventDate.getTime() - a.eventDate.getTime());
  return { items, quietCount, countsByType, settings };
}

/** How many customers are waiting, for the dashboard card and the menu badge. */
export async function countOutreachInbox(scope: OutreachScope): Promise<number> {
  const inbox = await getOutreachInbox(scope);
  return inbox.items.length;
}

/**
 * Records that the owner sent (or skipped) the message for an engagement
 * event, and closes the event so it is not listed again. Idempotent per event.
 */
export async function recordEventOutreach({
  scope,
  eventUuid,
  status,
  userId,
}: {
  scope: OutreachScope;
  eventUuid: string;
  status: OutreachStatus;
  userId: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const event = await prisma.engagementEvent.findFirst({
    where: { uuid: eventUuid, businessId: scope.businessId, ...(scope.branchId ? { customer: { createdBranchId: scope.branchId } } : {}) },
    select: { id: true, eventType: true, metadata: true, status: true, customer: { select: customerSelect }, outreachMessage: { select: { id: true } } },
  });
  if (!event) return { ok: false, error: "That customer is no longer on the list." };
  if (event.outreachMessage) return { ok: true };

  const business = await prisma.business.findUnique({ where: { id: scope.businessId }, select: { name: true } });
  const customerName = `${event.customer.firstName} ${event.customer.lastName ?? ""}`.trim();
  const template = await getMessageTemplate(scope.businessId, event.eventType);
  const text = renderEngagementMessage(template.message, event.metadata, customerName, business?.name ?? "");

  await prisma.$transaction([
    prisma.outreachMessage.create({
      data: {
        businessId: scope.businessId,
        membershipId: event.customer.id,
        branchId: scope.branchId ?? event.customer.createdBranchId ?? null,
        engagementEventId: event.id,
        eventType: event.eventType,
        status,
        text,
        sentByUserId: userId,
      },
    }),
    prisma.engagementEvent.update({ where: { id: event.id }, data: { status: status === "SENT" ? "RESOLVED" : "DISMISSED" } }),
  ]);
  return { ok: true };
}

/** Last visit per customer: the latest stamp, package visit or cashback purchase, else the day they joined. */
async function lastVisitByCustomer(businessId: number, branchId?: number | null): Promise<Map<number, Date>> {
  const rows = await prisma.$queryRaw<Array<{ id: number; last_visit: Date }>>`
    SELECT m.id,
           GREATEST(
             m.joined_at,
             COALESCE((SELECT MAX(st.created_at) FROM stamp_transactions st
                       JOIN customer_program_memberships cpm ON cpm.id = st.customer_program_membership_id
                       WHERE cpm.business_customer_membership_id = m.id), m.joined_at),
             COALESCE((SELECT MAX(ct.created_at) FROM cashback_transactions ct
                       WHERE ct.business_customer_membership_id = m.id AND ct.type = 'EARN'), m.joined_at)
           ) AS last_visit
    FROM business_customer_memberships m
    WHERE m.business_id = ${businessId}
      AND m.status = 'ACTIVE'
      AND m.marketing_consent = TRUE
      ${branchId ? Prisma.sql`AND m.created_branch_id = ${branchId}` : Prisma.empty}
  `;
  return new Map(rows.map((row) => [row.id, new Date(row.last_visit)]));
}

export type CampaignRecipient = {
  customer: { id: number; uuid: string; name: string; phone: string; tier: string | null };
  lastVisitAt: Date;
  message: string;
  link: string | null;
  status: OutreachStatus | null;
  quietUntil: Date | null;
};

export type CampaignView = {
  uuid: string;
  name: string;
  message: string;
  segment: CampaignSegment;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
  recipients: CampaignRecipient[];
  sent: number;
  skipped: number;
  remaining: number;
  quiet: number;
};

/** A campaign with its recipient checklist for the given scope (a branch manager sees their branch's customers). */
export async function getCampaign(scope: OutreachScope, campaignUuid: string, now = new Date()): Promise<CampaignView | null> {
  const campaign = await prisma.outreachCampaign.findFirst({ where: { uuid: campaignUuid, businessId: scope.businessId } });
  if (!campaign) return null;
  const [business, settings, lastVisits, done, lastMessages] = await Promise.all([
    prisma.business.findUnique({ where: { id: scope.businessId }, select: { name: true } }),
    getOutreachSettings(scope.businessId),
    lastVisitByCustomer(scope.businessId, scope.branchId),
    prisma.outreachMessage.findMany({ where: { campaignId: campaign.id }, select: { membershipId: true, status: true } }),
    // Messages from anything else (events or other promotions); a plain `not` would drop the event rows, whose campaignId is null.
    prisma.outreachMessage.groupBy({ by: ["membershipId"], where: { businessId: scope.businessId, OR: [{ campaignId: null }, { campaignId: { not: campaign.id } }] }, _max: { createdAt: true } }),
  ]);
  const window = segmentWindow(campaign.segment as CampaignSegment, now);
  const ids = Array.from(lastVisits.entries())
    .filter(([, lastVisit]) => (!window.after || lastVisit >= window.after) && (!window.before || lastVisit < window.before))
    .map(([id]) => id);
  const customers = ids.length
    ? await prisma.businessCustomerMembership.findMany({ where: { id: { in: ids } }, select: customerSelect, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] })
    : [];
  const doneById = new Map(done.map((row) => [row.membershipId, row.status]));
  const lastContact = new Map(lastMessages.map((row) => [row.membershipId, row._max.createdAt]));

  const recipients: CampaignRecipient[] = customers.map((customer) => {
    const name = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
    const message = renderCampaignMessage(campaign.message, name, business?.name ?? "");
    const status = doneById.get(customer.id) ?? null;
    const last = lastContact.get(customer.id);
    const quiet = !status && last && isQuiet(last, now, settings.quietDays) ? quietUntil(last, settings.quietDays) : null;
    return {
      customer: { id: customer.id, uuid: customer.uuid, name, phone: customer.phone, tier: customer.currentTier },
      lastVisitAt: lastVisits.get(customer.id) ?? now,
      message,
      link: whatsAppLink(customer.phone, message),
      status,
      quietUntil: quiet,
    };
  });
  // Waiting first, then quiet, then done.
  recipients.sort((a, b) => Number(Boolean(a.status)) - Number(Boolean(b.status)) || Number(Boolean(a.quietUntil)) - Number(Boolean(b.quietUntil)) || a.customer.name.localeCompare(b.customer.name));
  const sent = recipients.filter((r) => r.status === "SENT").length;
  const skipped = recipients.filter((r) => r.status === "SKIPPED").length;
  const quiet = recipients.filter((r) => r.quietUntil).length;
  return {
    uuid: campaign.uuid,
    name: campaign.name,
    message: campaign.message,
    segment: campaign.segment as CampaignSegment,
    status: campaign.status,
    createdAt: campaign.createdAt,
    recipients,
    sent,
    skipped,
    remaining: recipients.length - sent - skipped - quiet,
    quiet,
  };
}

export async function listCampaigns(businessId: number) {
  const campaigns = await prisma.outreachCampaign.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { uuid: true, name: true, segment: true, status: true, createdAt: true, _count: { select: { messages: true } } },
  });
  return campaigns.map((campaign) => ({ ...campaign, segment: campaign.segment as CampaignSegment, sent: campaign._count.messages }));
}

/** Records one campaign message as sent or skipped. Idempotent per customer and campaign. */
export async function recordCampaignOutreach({
  scope,
  campaignUuid,
  customerUuid,
  status,
  userId,
}: {
  scope: OutreachScope;
  campaignUuid: string;
  customerUuid: string;
  status: OutreachStatus;
  userId: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const campaign = await prisma.outreachCampaign.findFirst({ where: { uuid: campaignUuid, businessId: scope.businessId, status: "ACTIVE" }, select: { id: true, message: true } });
  if (!campaign) return { ok: false, error: "This promotion is closed." };
  const customer = await prisma.businessCustomerMembership.findFirst({
    where: { uuid: customerUuid, businessId: scope.businessId, status: "ACTIVE", marketingConsent: true, ...(scope.branchId ? { createdBranchId: scope.branchId } : {}) },
    select: customerSelect,
  });
  if (!customer) return { ok: false, error: "That customer is not on this list." };
  const business = await prisma.business.findUnique({ where: { id: scope.businessId }, select: { name: true } });
  const text = renderCampaignMessage(campaign.message, `${customer.firstName} ${customer.lastName ?? ""}`.trim(), business?.name ?? "");
  await prisma.outreachMessage.upsert({
    where: { campaignId_membershipId: { campaignId: campaign.id, membershipId: customer.id } },
    create: {
      businessId: scope.businessId,
      membershipId: customer.id,
      branchId: scope.branchId ?? customer.createdBranchId ?? null,
      campaignId: campaign.id,
      status,
      text,
      sentByUserId: userId,
    },
    update: {},
  });
  return { ok: true };
}
