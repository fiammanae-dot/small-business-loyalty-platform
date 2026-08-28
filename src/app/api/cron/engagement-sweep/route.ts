import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createEngagementEventIfAllowed } from "@/lib/engagement";
import {
  calendarYearBounds,
  daysBetween,
  decideInactivityBracket,
  inactivityEventTypes,
  inactivityRank,
  isBirthdayToday,
  type InactivityEventType,
} from "@/lib/engagement-sweep";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily engagement sweep.
 *
 * The scan flow raises the engagement events a visit produces (REWARD_READY,
 * NEAR_REWARD, REWARD_REDEEMED). The two kinds defined by a customer *not*
 * showing up - the lapsed brackets - and by the calendar - birthdays - have
 * nobody to trigger them, so they are raised here instead.
 *
 * Inactivity events are a ladder: a customer climbs 30 -> 60 -> 90 as they stay
 * away, and the brackets they have outgrown are resolved rather than left to
 * pile up. Coming back resolves the lot.
 */

// Customers are paged so a large business never loads its whole roster at once.
const CUSTOMER_BATCH_SIZE = 200;

type SweepError = {
  businessId: number;
  membershipId?: number;
  message: string;
};

type SweepCustomer = {
  id: number;
  birthday: Date | null;
  marketingConsent: boolean;
  joinedAt: Date;
  programMemberships: Array<{
    stampTransactions: Array<{ createdAt: Date }>;
    rewardRedemptions: Array<{ redeemedAt: Date }>;
  }>;
};

type CustomerOutcome = {
  createdInactivity: InactivityEventType | null;
  createdBirthday: boolean;
  resolved: number;
};

function isAuthorized(header: string | null, secret: string) {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(header);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();

  // Fail closed: an unset secret would otherwise leave a write endpoint open.
  if (!secret) {
    console.error("Engagement sweep refused to run: CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Cron secret is not configured." }, { status: 500 });
  }

  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const errors: SweepError[] = [];
  const created = { inactive30: 0, inactive60: 0, inactive90: 0, birthday: 0 };
  let businessesProcessed = 0;
  let customersScanned = 0;
  let resolved = 0;

  // Archived and soft-deleted tenants keep their rows for history; they must
  // not keep generating engagement.
  const businesses = await prisma.business.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  for (const business of businesses) {
    try {
      let cursor: number | undefined;

      for (;;) {
        const customers = await findCustomerBatch(business.id, cursor);
        if (customers.length === 0) break;
        cursor = customers[customers.length - 1].id;

        for (const customer of customers) {
          customersScanned += 1;

          // One customer's failure must not cost the rest of the sweep.
          try {
            const outcome = await sweepCustomer({ businessId: business.id, customer, now });

            resolved += outcome.resolved;
            if (outcome.createdBirthday) created.birthday += 1;
            if (outcome.createdInactivity === "INACTIVE_30_DAYS") created.inactive30 += 1;
            if (outcome.createdInactivity === "INACTIVE_60_DAYS") created.inactive60 += 1;
            if (outcome.createdInactivity === "INACTIVE_90_DAYS") created.inactive90 += 1;
          } catch (error) {
            errors.push({
              businessId: business.id,
              membershipId: customer.id,
              message: describeError(error),
            });
          }
        }

        if (customers.length < CUSTOMER_BATCH_SIZE) break;
      }

      businessesProcessed += 1;
    } catch (error) {
      errors.push({ businessId: business.id, message: describeError(error) });
    }
  }

  const summary = { businessesProcessed, customersScanned, created, resolved, errorCount: errors.length };
  if (errors.length > 0) console.error("Engagement sweep finished with errors.", errors);
  console.info("Engagement sweep completed.", summary);

  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}

/**
 * One page of a business's active customers, carrying only the newest stamp and
 * newest redemption per program membership.
 *
 * Inactivity only needs the most recent activity, so the nested `take: 1` keeps
 * a customer with years of history down to two rows instead of their whole
 * ledger.
 */
async function findCustomerBatch(businessId: number, cursor: number | undefined): Promise<SweepCustomer[]> {
  return prisma.businessCustomerMembership.findMany({
    where: { businessId, status: "ACTIVE" },
    select: {
      id: true,
      birthday: true,
      marketingConsent: true,
      joinedAt: true,
      programMemberships: {
        select: {
          stampTransactions: {
            where: { businessId },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          rewardRedemptions: {
            where: { businessId },
            select: { redeemedAt: true },
            orderBy: { redeemedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { id: "asc" },
    take: CUSTOMER_BATCH_SIZE,
    ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
  });
}

/**
 * The last time the customer did anything with this business.
 *
 * Falls back to when they joined, so someone who enrolled and never returned
 * starts their lapsed clock at enrollment rather than looking infinitely quiet.
 */
function resolveLastActivityAt(customer: SweepCustomer) {
  let latest = customer.joinedAt;

  for (const programMembership of customer.programMemberships) {
    for (const stamp of programMembership.stampTransactions) {
      if (stamp.createdAt > latest) latest = stamp.createdAt;
    }
    for (const redemption of programMembership.rewardRedemptions) {
      if (redemption.redeemedAt > latest) latest = redemption.redeemedAt;
    }
  }

  return latest;
}

async function sweepCustomer({
  businessId,
  customer,
  now,
}: {
  businessId: number;
  customer: SweepCustomer;
  now: Date;
}): Promise<CustomerOutcome> {
  return prisma.$transaction(async (tx) => {
    const outcome: CustomerOutcome = { createdInactivity: null, createdBirthday: false, resolved: 0 };

    const lastActivityAt = resolveLastActivityAt(customer);
    const daysInactive = daysBetween(lastActivityAt, now);
    const bracket = decideInactivityBracket(daysInactive);

    // Back within 30 days clears the whole ladder; otherwise only the brackets
    // the customer has climbed past are closed out.
    const supersededTypes = bracket
      ? inactivityEventTypes.filter((type) => inactivityRank(type) < inactivityRank(bracket))
      : inactivityEventTypes;

    if (supersededTypes.length > 0) {
      const { count } = await tx.engagementEvent.updateMany({
        where: {
          businessId,
          customerId: customer.id,
          eventType: { in: supersededTypes },
          status: "ACTIVE",
        },
        data: { status: "RESOLVED" },
      });
      outcome.resolved += count;
    }

    if (bracket) {
      // The helper hands back the existing row when one is already ACTIVE, so
      // this pre-check is what separates "raised" from "already standing" in
      // the reported counts.
      const alreadyActive = await tx.engagementEvent.findFirst({
        where: { businessId, customerId: customer.id, eventType: bracket, status: "ACTIVE" },
        select: { id: true },
      });

      // Consent gate and ACTIVE-dedupe both live in the helper, deliberately.
      const event = await createEngagementEventIfAllowed({
        tx,
        businessId,
        customerId: customer.id,
        eventType: bracket,
        metadata: { daysInactive, lastActivityAt: lastActivityAt.toISOString() },
      });

      if (event && !alreadyActive) outcome.createdInactivity = bracket;
    }

    if (isBirthdayToday(customer.birthday, now) && customer.marketingConsent) {
      // Deliberately not the helper: its ACTIVE-dedupe would block every future
      // birthday for anyone whose event is never dismissed. Once per calendar
      // year is the rule that actually applies here.
      const { start, end } = calendarYearBounds(now);
      const raisedThisYear = await tx.engagementEvent.findFirst({
        where: {
          businessId,
          customerId: customer.id,
          eventType: "BIRTHDAY",
          eventDate: { gte: start, lt: end },
        },
        select: { id: true },
      });

      if (!raisedThisYear) {
        await tx.engagementEvent.create({
          data: {
            businessId,
            customerId: customer.id,
            eventType: "BIRTHDAY",
            eventDate: now,
            status: "ACTIVE",
            metadata: { source: "engagement-sweep" },
          },
          select: { id: true },
        });
        outcome.createdBirthday = true;
      }
    }

    return outcome;
  });
}
