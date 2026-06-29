import { CustomerCreateForm } from "@/components/CustomerCreateForm";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { ReferralReferrerLookupPreview } from "@/components/ReferralReferrerLookupPreview";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { prisma } from "@/lib/prisma";
import { createCustomerAction } from "@/app/dashboard/actions";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string; referralCode?: string; referredByPhoneNumber?: string; referredBySearch?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;
  const referredBySearch = params.referredBySearch ?? params.referredByPhoneNumber ?? params.ref ?? "";
  const selectedReferralCode = params.referralCode ?? params.ref ?? "";
  const activePrograms = await prisma.loyaltyProgram.findMany({
    where: { businessId: user.businessId, active: true },
    select: { uuid: true, name: true, rewardName: true, requiredStamps: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Enroll customer">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <CustomerCreateForm
          action={createCustomerAction}
          csrfInput={<CsrfInput scope="dashboard:customers" />}
          cancelHref="/dashboard/customers"
          lookupPath="/dashboard/customers/new"
          activePrograms={activePrograms}
          branchOptions={[
            { value: "", label: "No branch selected", description: "Enroll without branch attribution" },
            ...business.branches.map((branch) => ({
              value: branch.id.toString(),
              label: branch.name,
              description: business.name,
              badge: branch.status === "ACTIVE" ? "Active" : "Inactive",
              disabled: branch.status !== "ACTIVE",
            })),
          ]}
          initialValues={{
            referralCode: selectedReferralCode,
            referredBySearch,
          }}
          referralPreview={<ReferralReferrerLookupPreview businessId={user.businessId} query={referredBySearch} selectedReferralCode={selectedReferralCode} />}
        />
      </section>
    </DashboardShell>
  );
}
