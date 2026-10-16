/**
 * Pure rules for manual WhatsApp outreach (no database, unit-tested):
 * which events can be acted on, the quiet rule, the WhatsApp link, campaign
 * segments and form validation.
 */
import type { EngagementEventType } from "@prisma/client";

export const OUTREACH_EVENTS: Array<{ type: EngagementEventType; label: string; description: string }> = [
  { type: "BIRTHDAY", label: "Birthday", description: "On the customer's birthday." },
  { type: "INACTIVE_30_DAYS", label: "Quiet for 30 days", description: "No visit for a month." },
  { type: "INACTIVE_60_DAYS", label: "Quiet for 60 days", description: "No visit for two months." },
  { type: "INACTIVE_90_DAYS", label: "Quiet for 90 days", description: "No visit for three months." },
  { type: "REWARD_READY", label: "Reward ready", description: "Their card is full and a reward is waiting." },
  { type: "NEAR_REWARD", label: "One stamp away", description: "One more visit completes the card." },
  { type: "WELCOME_CUSTOMER", label: "Just joined", description: "A welcome the day they join." },
  { type: "REWARD_REDEEMED", label: "Reward collected", description: "A thank-you after a reward." },
];

export const DEFAULT_ENABLED_EVENTS: EngagementEventType[] = ["BIRTHDAY", "INACTIVE_30_DAYS", "INACTIVE_60_DAYS", "INACTIVE_90_DAYS", "REWARD_READY"];
export const DEFAULT_QUIET_DAYS = 14;
export const MAX_QUIET_DAYS = 90;

/** When one customer has several open events, the one worth sending first. */
const EVENT_PRIORITY: EngagementEventType[] = ["BIRTHDAY", "REWARD_READY", "INACTIVE_90_DAYS", "INACTIVE_60_DAYS", "INACTIVE_30_DAYS", "NEAR_REWARD", "WELCOME_CUSTOMER", "REWARD_REDEEMED"];

export function eventPriority(type: EngagementEventType): number {
  const index = EVENT_PRIORITY.indexOf(type);
  return index === -1 ? EVENT_PRIORITY.length : index;
}

export function eventLabel(type: EngagementEventType): string {
  return OUTREACH_EVENTS.find((event) => event.type === type)?.label ?? type;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** True while a customer is inside the quiet period after their last message. */
export function isQuiet(lastContactAt: Date | null | undefined, now: Date, quietDays: number): boolean {
  if (!lastContactAt) return false;
  return now.getTime() - lastContactAt.getTime() < quietDays * DAY_MS;
}

export function quietUntil(lastContactAt: Date, quietDays: number): Date {
  return new Date(lastContactAt.getTime() + quietDays * DAY_MS);
}

/** wa.me link with the message pre-filled, or null when the number is not a UAE mobile. */
export function whatsAppLink(phone: string, text: string): string | null {
  const compact = phone.trim().replace(/[\s\-()]/g, "");
  let digits = compact.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00971")) digits = digits.slice(2);
  if (digits.startsWith("05")) digits = `971${digits.slice(1)}`;
  if (!digits.startsWith("9715") || digits.length !== 12) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export const CAMPAIGN_SEGMENTS = [
  { value: "VISITED_30", label: "Visited in the last 30 days", description: "Your regulars." },
  { value: "VISITED_90", label: "Visited in the last 90 days", description: "Everyone active this season." },
  { value: "VISITED_180", label: "Visited in the last 6 months", description: "Active and recently lapsed." },
  { value: "QUIET_90", label: "Quiet for 90 days or more", description: "Win-back: no visit in three months." },
  { value: "ALL", label: "All customers", description: "Everyone who agreed to marketing." },
] as const;

export type CampaignSegment = (typeof CAMPAIGN_SEGMENTS)[number]["value"];

export function isCampaignSegment(value: string): value is CampaignSegment {
  return CAMPAIGN_SEGMENTS.some((segment) => segment.value === value);
}

export function segmentLabel(value: string): string {
  return CAMPAIGN_SEGMENTS.find((segment) => segment.value === value)?.label ?? value;
}

/** The last-visit window a segment selects: `after` keeps recent visitors, `before` keeps quiet ones. */
export function segmentWindow(segment: CampaignSegment, now: Date): { after?: Date; before?: Date } {
  const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);
  switch (segment) {
    case "VISITED_30":
      return { after: daysAgo(30) };
    case "VISITED_90":
      return { after: daysAgo(90) };
    case "VISITED_180":
      return { after: daysAgo(180) };
    case "QUIET_90":
      return { before: daysAgo(90) };
    case "ALL":
      return {};
  }
}

export type OutreachSettingsInput = { enabledEvents: EngagementEventType[]; quietDays: number };

export function parseOutreachSettingsInput(input: { events: string[]; quietDays: string | undefined }): { ok: true; data: OutreachSettingsInput } | { ok: false; error: string } {
  const known = new Set(OUTREACH_EVENTS.map((event) => event.type as string));
  const enabledEvents = Array.from(new Set(input.events.filter((event) => known.has(event)))) as EngagementEventType[];
  const quietDays = input.quietDays === undefined || input.quietDays.trim() === "" ? DEFAULT_QUIET_DAYS : Number(input.quietDays);
  if (!Number.isInteger(quietDays) || quietDays < 0 || quietDays > MAX_QUIET_DAYS) {
    return { ok: false, error: `Quiet period must be a whole number of days from 0 to ${MAX_QUIET_DAYS}.` };
  }
  return { ok: true, data: { enabledEvents, quietDays } };
}

export const CAMPAIGN_MESSAGE_MAX = 700;

export function parseCampaignInput(input: { name: string | undefined; message: string | undefined; segment: string | undefined }): { ok: true; data: { name: string; message: string; segment: CampaignSegment } } | { ok: false; error: string } {
  const name = (input.name ?? "").trim();
  const message = (input.message ?? "").trim();
  const segment = input.segment ?? "";
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Give the promotion a short name (2 to 80 characters)." };
  if (message.length < 10) return { ok: false, error: "Write the message customers will receive (at least 10 characters)." };
  if (message.length > CAMPAIGN_MESSAGE_MAX) return { ok: false, error: `Keep the message under ${CAMPAIGN_MESSAGE_MAX} characters.` };
  if (!isCampaignSegment(segment)) return { ok: false, error: "Choose who should receive it." };
  return { ok: true, data: { name, message, segment } };
}

/** Fills the customer's and business's name into a campaign message. */
export function renderCampaignMessage(message: string, customerName: string, businessName: string): string {
  return message.replaceAll("{{customer_name}}", customerName).replaceAll("{{business_name}}", businessName).trim();
}
