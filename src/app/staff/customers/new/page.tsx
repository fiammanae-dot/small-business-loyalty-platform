import { CustomerCreateForm } from "@/components/CustomerCreateForm";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { ReferralReferrerLookupPreview } from "@/components/ReferralReferrerLookupPreview";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createStaffCustomerAction } from "@/app/staff/customers/actions";

export default async function NewStaffCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string; referralCode?: string; referredByPhoneNumber?: string; referredBySearch?: string }>;
}) {
  const user = await requireRole("STAFF");
  const params = await searchParams;
  const referredBySearch = params.referredBySearch ?? params.referredByPhoneNumber ?? params.ref ?? "";
  const selectedReferralCode = params.referralCode ?? params.ref ?? "";
  const activePrograms = user.businessId
    ? await prisma.loyaltyProgram.findMany({
        where: { businessId: user.businessId, active: true },
        select: { uuid: true, name: true, rewardName: true, requiredStamps: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <DashboardShell user={user} eyebrow="Staff" title="Enroll customer" hideWelcomeMessage>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <CustomerCreateForm
          action={createStaffCustomerAction}
          csrfInput={<CsrfInput scope="staff:customers" />}
          cancelHref="/staff"
          lookupPath="/staff/customers/new"
          activePrograms={activePrograms}
          initialValues={{
            referralCode: selectedReferralCode,
            referredBySearch,
          }}
          referralPreview={user.businessId ? <ReferralReferrerLookupPreview businessId={user.businessId} query={referredBySearch} selectedReferralCode={selectedReferralCode} /> : null}
          inputFocusClass="business-ring focus:ring-0"
          primaryButtonClass="business-button text-white"
        />
      </section>
    </DashboardShell>
  );
}
