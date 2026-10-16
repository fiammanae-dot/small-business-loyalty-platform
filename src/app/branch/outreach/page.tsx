import Link from "next/link";
import type { EngagementEventType } from "@prisma/client";
import { DashboardShell } from "@/components/DashboardShell";
import { OutreachInbox } from "@/components/outreach/OutreachInbox";
import { SectionCard, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getOutreachInbox, listCampaigns } from "@/lib/outreach";
import { OUTREACH_EVENTS, segmentLabel } from "@/lib/outreach-rules";
import { requireRole } from "@/lib/session";

type SearchParams = Promise<{ type?: string; error?: string; success?: string }>;

/** Manual WhatsApp outreach for a branch manager: their branch's customers only. */
export default async function BranchOutreachPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("BRANCH_MANAGER");
  const params = await searchParams;
  const businessId = user.businessId as number;
  const filter = OUTREACH_EVENTS.find((event) => event.type === params.type)?.type as EngagementEventType | undefined;
  const [inbox, campaigns] = await Promise.all([getOutreachInbox({ businessId, branchId: user.branchId }), listCampaigns(businessId)]);
  const open = campaigns.filter((campaign) => campaign.status === "ACTIVE");

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="WhatsApp outreach" hideWelcomeMessage>
      {params.error || params.success ? (
        <p className={`rounded-md border px-3 py-2 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{params.error ?? params.success}</p>
      ) : null}
      <OutreachInbox inbox={inbox} filter={filter} customerHref={(uuid) => `/branch/customers/${uuid}`} />
      {open.length ? (
        <SectionCard title="Open promotions" description="Promotions the owner started. Your branch's customers are listed on each.">
          <ul className="grid gap-2">
            {open.map((campaign) => (
              <li key={campaign.uuid} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="min-w-0">
                  <Link href={`/branch/outreach/campaigns/${campaign.uuid}`} className="block truncate text-sm font-semibold text-[#111827] hover:underline">
                    {campaign.name}
                  </Link>
                  <p className="text-xs text-[#6B7280]">
                    {segmentLabel(campaign.segment)} · {formatDate(campaign.createdAt)}
                  </p>
                </div>
                <StatusBadge tone="success">Open</StatusBadge>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </DashboardShell>
  );
}
