import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { CampaignChecklist } from "@/components/outreach/CampaignChecklist";
import { getCampaign } from "@/lib/outreach";
import { requireRole } from "@/lib/session";

export default async function BranchCampaignPage({ params, searchParams }: { params: Promise<{ uuid: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireRole("BRANCH_MANAGER");
  const { uuid } = await params;
  const { error } = await searchParams;
  const campaign = await getCampaign({ businessId: user.businessId as number, branchId: user.branchId }, uuid);
  if (!campaign) notFound();

  return (
    <DashboardShell user={user} eyebrow="Branch Manager" title="Promotion" hideWelcomeMessage>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <CampaignChecklist campaign={campaign} basePath="/branch/outreach" customerHref={(id) => `/branch/customers/${id}`} />
    </DashboardShell>
  );
}
