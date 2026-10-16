import Link from "next/link";
import { Megaphone } from "lucide-react";
import { CsrfInput } from "@/components/CsrfInput";
import { Button, EmptyState, SectionCard, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { OutreachSettings, listCampaigns } from "@/lib/outreach";
import { CAMPAIGN_MESSAGE_MAX, CAMPAIGN_SEGMENTS, MAX_QUIET_DAYS, OUTREACH_EVENTS, segmentLabel } from "@/lib/outreach-rules";
import { archiveCampaignAction, createCampaignAction, saveOutreachSettingsAction } from "@/app/dashboard/outreach/actions";

/** Promotions sent by hand: a list of past ones and the form for a new one. Owner only. */
export function CampaignsPanel({ campaigns, basePath }: { campaigns: Awaited<ReturnType<typeof listCampaigns>>; basePath: string }) {
  return (
    <SectionCard title="Promotions" description="Write one message, choose who gets it, then work through the list one tap at a time. Customers messaged in the quiet period are held back automatically.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form action={createCampaignAction} className="grid gap-3">
          <CsrfInput scope="outreach" />
          <label className="grid gap-1 text-sm font-medium text-[#111827]">
            Name (for you)
            <input name="name" required maxLength={80} placeholder="Eid offer" className="h-11 rounded-md border border-[#E5E7EB] px-3 text-sm" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-[#111827]">
            Message
            <textarea name="message" required rows={4} maxLength={CAMPAIGN_MESSAGE_MAX} placeholder="Hi {{customer_name}}, this week at {{business_name}}: 20% off every facial. Show this message at reception." className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm" />
            <span className="text-xs font-normal text-[#6B7280]">{"{{customer_name}}"} and {"{{business_name}}"} are filled in for each customer.</span>
          </label>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-[#111827]">Who gets it</legend>
            {CAMPAIGN_SEGMENTS.map((segment, index) => (
              <label key={segment.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm">
                <input type="radio" name="segment" value={segment.value} defaultChecked={index === 1} className="mt-1 h-4 w-4" />
                <span>
                  <span className="block font-semibold text-[#111827]">{segment.label}</span>
                  <span className="block text-xs text-[#6B7280]">{segment.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Button type="submit" variant="business" size="md" className="w-fit">
            Start promotion
          </Button>
        </form>

        <div className="grid content-start gap-2">
          {campaigns.length === 0 ? (
            <EmptyState icon={<Megaphone className="h-5 w-5" />} title="No promotions yet" description="Your promotions and how far you got with each will show here." />
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign.uuid} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="min-w-0">
                  <Link href={`${basePath}/campaigns/${campaign.uuid}`} className="block truncate text-sm font-semibold text-[#111827] hover:underline">
                    {campaign.name}
                  </Link>
                  <p className="text-xs text-[#6B7280]">
                    {segmentLabel(campaign.segment)} · {campaign.sent} handled · {formatDate(campaign.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={campaign.status === "ACTIVE" ? "success" : "neutral"}>{campaign.status === "ACTIVE" ? "Open" : "Closed"}</StatusBadge>
                  {campaign.status === "ACTIVE" ? (
                    <form action={archiveCampaignAction}>
                      <CsrfInput scope="outreach" />
                      <input type="hidden" name="campaignUuid" value={campaign.uuid} />
                      <Button type="submit" variant="ghost" size="sm">
                        Close
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );
}

/** Which events make the list, and the quiet period. Owner only. */
export function OutreachRulesPanel({ settings }: { settings: OutreachSettings }) {
  return (
    <SectionCard title="Rules" description="Only customers who agreed to marketing are ever listed. After any message (sent or skipped) a customer rests for the quiet period.">
      <form action={saveOutreachSettingsAction} className="grid gap-4">
        <CsrfInput scope="outreach" />
        <fieldset className="grid gap-2 md:grid-cols-2">
          <legend className="mb-1 text-sm font-medium text-[#111827]">Contact customers when</legend>
          {OUTREACH_EVENTS.map((event) => (
            <label key={event.type} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm">
              <input type="checkbox" name="events" value={event.type} defaultChecked={settings.enabledEvents.includes(event.type)} className="mt-1 h-4 w-4" />
              <span>
                <span className="block font-semibold text-[#111827]">{event.label}</span>
                <span className="block text-xs text-[#6B7280]">{event.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="grid max-w-xs gap-1 text-sm font-medium text-[#111827]">
          Quiet period (days)
          <input name="quietDays" type="number" min="0" max={MAX_QUIET_DAYS} defaultValue={settings.quietDays} className="h-11 rounded-md border border-[#E5E7EB] px-3 text-sm" />
          <span className="text-xs font-normal text-[#6B7280]">No customer is listed again, for any reason, within this many days of their last message.</span>
        </label>
        <Button type="submit" variant="business" size="md" className="w-fit">
          Save rules
        </Button>
      </form>
    </SectionCard>
  );
}
