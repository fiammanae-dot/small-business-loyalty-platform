import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CsrfInput } from "@/components/CsrfInput";
import { SendOnWhatsAppButton } from "@/components/outreach/SendOnWhatsAppButton";
import { Button, EmptyState, MetricCard, ProgressBar, SectionCard, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { CampaignView } from "@/lib/outreach";
import { segmentLabel } from "@/lib/outreach-rules";
import { markCampaignOutreachAction } from "@/app/dashboard/outreach/actions";

/** One promotion: the message, progress, and every recipient with the one-tap send. */
export function CampaignChecklist({ campaign, basePath, customerHref }: { campaign: CampaignView; basePath: string; customerHref: (uuid: string) => string }) {
  const total = campaign.recipients.length;
  const handled = campaign.sent + campaign.skipped;
  const percent = total ? Math.round((handled / total) * 100) : 0;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={basePath} className="inline-flex items-center gap-2 text-sm font-semibold business-text hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to outreach
        </Link>
        <StatusBadge tone={campaign.status === "ACTIVE" ? "success" : "neutral"}>{campaign.status === "ACTIVE" ? "Open" : "Closed"}</StatusBadge>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Progress">
        <MetricCard label="Recipients" value={total} helper={segmentLabel(campaign.segment)} />
        <MetricCard label="Sent" value={campaign.sent} tone="success" />
        <MetricCard label="Skipped" value={campaign.skipped} />
        <MetricCard label="Resting" value={campaign.quiet} helper="Messaged recently" tone={campaign.quiet ? "warning" : "neutral"} />
      </section>

      <SectionCard title={campaign.name} description={`Started ${formatDate(campaign.createdAt)}. ${handled} of ${total} handled.`}>
        <ProgressBar value={percent} />
        <p className="mt-3 whitespace-pre-line rounded-lg bg-[#F9FAFB] px-3 py-2 text-sm leading-6 text-[#374151]">{campaign.message}</p>
      </SectionCard>

      <SectionCard title="Customers" description="Waiting first. Each send opens WhatsApp with the message filled in and ticks the customer off.">
        {campaign.recipients.length === 0 ? (
          <EmptyState title="Nobody matches this segment yet" description="Customers who agreed to marketing and fit the segment will appear here." />
        ) : (
          <ul className="grid gap-2">
            {campaign.recipients.map((recipient) => (
              <li key={recipient.customer.uuid} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
                <div className="min-w-0">
                  <Link href={customerHref(recipient.customer.uuid)} className="block truncate text-sm font-semibold text-[#111827] hover:underline">
                    {recipient.customer.name}
                  </Link>
                  <p className="text-xs text-[#6B7280]">
                    Last visit {formatDate(recipient.lastVisitAt)}
                    {recipient.customer.tier ? ` · ${recipient.customer.tier}` : ""}
                  </p>
                </div>
                {recipient.status ? (
                  <StatusBadge tone={recipient.status === "SENT" ? "success" : "neutral"}>{recipient.status === "SENT" ? "Sent" : "Skipped"}</StatusBadge>
                ) : recipient.quietUntil ? (
                  <StatusBadge tone="warning">Resting until {formatDate(recipient.quietUntil)}</StatusBadge>
                ) : campaign.status === "ACTIVE" ? (
                  <form action={markCampaignOutreachAction} className="flex items-center gap-2">
                    <CsrfInput scope="outreach" />
                    <input type="hidden" name="campaignUuid" value={campaign.uuid} />
                    <input type="hidden" name="customerUuid" value={recipient.customer.uuid} />
                    <SendOnWhatsAppButton link={recipient.link} disabledReason="Not a UAE mobile number" />
                    <Button type="submit" name="status" value="SKIPPED" variant="ghost" size="md">
                      Skip
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
