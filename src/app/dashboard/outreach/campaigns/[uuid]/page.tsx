import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { CampaignChecklist } from "@/components/outreach/CampaignChecklist";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { getCampaign } from "@/lib/outreach";

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ uuid: string }>; searchParams: Promise<{ error?: string }> }) {
  const { user } = await getBusinessOwnerContext();
  const { uuid } = await params;
  const { error } = await searchParams;
  const campaign = await getCampaign({ businessId: user.businessId as number }, uuid);
  if (!campaign) notFound();

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Promotion" hideWelcomeMessage>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <CampaignChecklist campaign={campaign} basePath="/dashboard/outreach" customerHref={(id) => `/dashboard/customers/${id}`} />
    </DashboardShell>
  );
}
