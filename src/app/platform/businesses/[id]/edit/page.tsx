import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessForm } from "@/components/BusinessForm";
import { DashboardShell } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { updateBusinessAction } from "@/app/platform/businesses/actions";

export default async function EditBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const { id } = await params;
  const query = await searchParams;
  const [business, plans] = await Promise.all([
    prisma.business.findUnique({
      where: { uuid: id },
      include: {
        branding: true,
        communicationSettings: true,
        subscriptions: {
          where: { status: { in: ["TRIAL", "ACTIVE"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.subscriptionPlan.findMany({
      orderBy: { maxBranches: "asc" },
      select: { id: true, code: true, name: true, monthlyPrice: true, annualPrice: true, billingCycleSupport: true },
    }),
  ]);

  if (!business) notFound();

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title={`Edit ${business.name}`}>
      <div>
        <Link href={`/platform/businesses/${business.uuid}`} className="text-sm font-semibold text-[#F97316]">
          Back to business
        </Link>
      </div>
      <BusinessForm
        action={updateBusinessAction}
        plans={plans}
        error={query.error}
        mode="edit"
        business={{
          id: business.id,
          uuid: business.uuid,
          name: business.name,
          businessType: business.businessType,
          status: business.status,
          branding: business.branding,
          communicationSettings: business.communicationSettings,
          subscriptionPlanId: business.subscriptions[0]?.subscriptionPlanId,
          billingCycle: business.subscriptions[0]?.billingCycle,
        }}
      />
    </DashboardShell>
  );
}
