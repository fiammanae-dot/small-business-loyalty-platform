import type { EngagementEventType } from "@prisma/client";
import { DashboardShell } from "@/components/DashboardShell";
import { OutreachInbox } from "@/components/outreach/OutreachInbox";
import { CampaignsPanel, OutreachRulesPanel } from "@/components/outreach/OutreachOwnerPanels";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { getOutreachInbox, listCampaigns } from "@/lib/outreach";
import { OUTREACH_EVENTS } from "@/lib/outreach-rules";

type SearchParams = Promise<{ type?: string; error?: string; success?: string }>;

/** Manual WhatsApp outreach for the owner: who to contact today, promotions, and the rules. */
export default async function OutreachPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await getBusinessOwnerContext();
  const params = await searchParams;
  const filter = OUTREACH_EVENTS.find((event) => event.type === params.type)?.type as EngagementEventType | undefined;
  const [inbox, campaigns] = await Promise.all([getOutreachInbox({ businessId: user.businessId as number }), listCampaigns(user.businessId as number)]);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="WhatsApp outreach" hideWelcomeMessage>
      {params.error || params.success ? (
        <p className={`rounded-md border px-3 py-2 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{params.error ?? params.success}</p>
      ) : null}
      <OutreachInbox inbox={inbox} filter={filter} customerHref={(uuid) => `/dashboard/customers/${uuid}`} />
      <CampaignsPanel campaigns={campaigns} basePath="/dashboard/outreach" />
      <OutreachRulesPanel settings={inbox.settings} />
    </DashboardShell>
  );
}
