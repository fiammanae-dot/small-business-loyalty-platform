import { CustomerCreateForm } from "@/components/CustomerCreateForm";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { ReferralPhoneLookupPreview } from "@/components/ReferralPhoneLookupPreview";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createStaffCustomerAction } from "@/app/staff/customers/actions";

export default async function NewStaffCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string; referredByPhoneNumber?: string }>;
}) {
  const user = await requireRole("STAFF");
  const params = await searchParams;
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
            referralCode: params.ref ?? "",
            referredByPhoneNumber: params.referredByPhoneNumber ?? "",
          }}
          referralPreview={user.businessId ? <ReferralPhoneLookupPreview businessId={user.businessId} phone={params.referredByPhoneNumber} /> : null}
          inputFocusClass="business-ring focus:ring-0"
          primaryButtonClass="business-button text-white"
        />
      </section>
    </DashboardShell>
  );
}
