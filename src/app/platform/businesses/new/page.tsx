import Link from "next/link";
import { BusinessForm } from "@/components/BusinessForm";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createBusinessAction } from "@/app/platform/businesses/actions";

export default async function NewBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { maxBranches: "asc" },
    select: { id: true, code: true, name: true, monthlyPrice: true, annualPrice: true, billingCycleSupport: true },
  });

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Create business">
      <div>
        <Link href="/platform/businesses" className="text-sm font-semibold text-[#F97316]">
          Back to businesses
        </Link>
      </div>
      <BusinessForm action={createBusinessAction} plans={plans} error={params.error} mode="create" csrfInput={<CsrfInput scope="platform:businesses" />} />
    </DashboardShell>
  );
}
