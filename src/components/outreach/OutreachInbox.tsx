import Link from "next/link";
import { Cake, Gift, MessageCircle, Moon, Sparkles, UserPlus } from "lucide-react";
import type { EngagementEventType } from "@prisma/client";
import { CsrfInput } from "@/components/CsrfInput";
import { SendOnWhatsAppButton } from "@/components/outreach/SendOnWhatsAppButton";
import { Button, EmptyState, SectionCard, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { OutreachInbox as OutreachInboxData } from "@/lib/outreach";
import { eventLabel, OUTREACH_EVENTS } from "@/lib/outreach-rules";
import { markEventOutreachAction } from "@/app/dashboard/outreach/actions";

const EVENT_ICONS: Partial<Record<EngagementEventType, typeof Cake>> = {
  BIRTHDAY: Cake,
  REWARD_READY: Gift,
  NEAR_REWARD: Sparkles,
  INACTIVE_30_DAYS: Moon,
  INACTIVE_60_DAYS: Moon,
  INACTIVE_90_DAYS: Moon,
  WELCOME_CUSTOMER: UserPlus,
  REWARD_REDEEMED: Gift,
};

const EVENT_TONES: Partial<Record<EngagementEventType, "success" | "warning" | "info" | "neutral" | "brand">> = {
  BIRTHDAY: "brand",
  REWARD_READY: "success",
  NEAR_REWARD: "info",
  INACTIVE_30_DAYS: "warning",
  INACTIVE_60_DAYS: "warning",
  INACTIVE_90_DAYS: "warning",
};

/**
 * The "contact today" list: one row per customer with the message ready and
 * one green button that opens WhatsApp and records the send.
 */
export function OutreachInbox({ inbox, customerHref, filter }: { inbox: OutreachInboxData; customerHref: (uuid: string) => string; filter?: EngagementEventType }) {
  const items = filter ? inbox.items.filter((item) => item.eventType === filter) : inbox.items;
  const counts = OUTREACH_EVENTS.filter((event) => inbox.countsByType[event.type]).map((event) => ({ ...event, count: inbox.countsByType[event.type] ?? 0 }));

  return (
    <SectionCard
      title={`To contact today${inbox.items.length ? ` (${inbox.items.length})` : ""}`}
      description={
        inbox.quietCount > 0
          ? `${inbox.quietCount} more ${inbox.quietCount === 1 ? "customer is" : "customers are"} resting: messaged in the last ${inbox.settings.quietDays} days.`
          : "Each customer appears once, with the message ready. Tap Send: WhatsApp opens with the text filled in, and the customer is marked as contacted."
      }
    >
      {counts.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="?" className={`rounded-full border px-3 py-1 text-xs font-semibold ${!filter ? "business-button border-transparent text-white" : "border-[#E5E7EB] bg-white text-[#374151]"}`}>
            All ({inbox.items.length})
          </Link>
          {counts.map((event) => (
            <Link key={event.type} href={`?type=${event.type}`} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === event.type ? "business-button border-transparent text-white" : "border-[#E5E7EB] bg-white text-[#374151]"}`}>
              {event.label} ({event.count})
            </Link>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-5 w-5" />}
          title={inbox.items.length === 0 ? "Nobody to contact right now" : "No customers for this filter"}
          description={inbox.items.length === 0 ? "New birthdays, quiet customers and ready rewards appear here every morning." : "Pick another event above."}
        />
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => {
            const Icon = EVENT_ICONS[item.eventType] ?? MessageCircle;
            return (
              <li key={item.eventUuid} className="grid gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={EVENT_TONES[item.eventType] ?? "neutral"}>
                      <Icon aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                      {eventLabel(item.eventType)}
                    </StatusBadge>
                    <Link href={customerHref(item.customer.uuid)} className="truncate text-base font-semibold text-[#111827] hover:underline">
                      {item.customer.name}
                    </Link>
                    {item.customer.tier ? <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{item.customer.tier}</span> : null}
                    <span className="text-xs text-[#9CA3AF]">since {formatDate(item.eventDate)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-[#F9FAFB] px-3 py-2 text-sm leading-6 text-[#374151]">{item.message}</p>
                  {item.otherOpenEvents.length ? (
                    <p className="mt-1 text-xs text-[#9CA3AF]">Also: {item.otherOpenEvents.map(eventLabel).join(", ")}</p>
                  ) : null}
                </div>
                <form action={markEventOutreachAction} className="flex shrink-0 flex-wrap items-center gap-2">
                  <CsrfInput scope="outreach" />
                  <input type="hidden" name="eventUuid" value={item.eventUuid} />
                  <SendOnWhatsAppButton link={item.link} disabledReason="Not a UAE mobile number" />
                  <Button type="submit" name="status" value="SKIPPED" variant="ghost" size="md">
                    Skip
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
