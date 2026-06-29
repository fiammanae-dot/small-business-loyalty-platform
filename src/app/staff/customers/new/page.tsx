import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { ReferralPhoneLookupPreview } from "@/components/ReferralPhoneLookupPreview";
import { SearchableCombobox } from "@/components/SearchableCombobox";
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
        {params.error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p> : null}
        <form action={createStaffCustomerAction} className="grid gap-5">
          <CsrfInput scope="staff:customers" />
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name" />
            <Input name="phone" label="Phone" required />
            <Input name="email" label="Email" type="email" />
            <Input name="birthday" label="Birthday" type="date" />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#111827]">
            <input type="checkbox" name="marketingConsent" className="h-4 w-4 rounded border-[#E5E7EB]" />
            Marketing consent
          </label>
          <ProgramEnrollmentField activePrograms={activePrograms} />
          <div className="grid gap-3 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#111827]">Referred by phone number</span>
              <input name="referredByPhoneNumber" defaultValue={params.referredByPhoneNumber ?? ""} placeholder="0501234567" className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
            </label>
            {user.businessId ? <ReferralPhoneLookupPreview businessId={user.businessId} phone={params.referredByPhoneNumber} /> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" formAction="/staff/customers/new" formMethod="get" className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#111827]">
                Check referrer
              </button>
              <p className="text-sm text-[#6B7280]">Optional. Rewards qualify only after the new customer receives their first valid stamp.</p>
            </div>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Referral code or link</span>
            <input name="referralCode" defaultValue={params.ref ?? ""} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Notes</span>
            <textarea name="notes" rows={4} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none business-ring focus:ring-0" />
          </label>
          <div className="flex gap-3">
            <button type="submit" className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
              Enroll customer
            </button>
            <Link href="/staff" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}

function ProgramEnrollmentField({
  activePrograms,
}: {
  activePrograms: Array<{ uuid: string; name: string; rewardName: string; requiredStamps: number }>;
}) {
  if (activePrograms.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Customer card will be created now. No active loyalty program is available for enrollment.
      </div>
    );
  }

  if (activePrograms.length === 1) {
    const program = activePrograms[0];
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Customer will be enrolled into <span className="font-semibold">{program.name}</span> after creation.
      </div>
    );
  }

  return (
    <SearchableCombobox
      label="Loyalty program"
      name="selectedProgramUuid"
      placeholder="Select a loyalty program"
      emptyLabel="No active programs found."
      required
      options={activePrograms.map((program) => ({
        value: program.uuid,
        label: program.name,
        description: `${program.rewardName} - ${program.requiredStamps} visits`,
      }))}
    />
  );
}

function Input({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} required={required} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
    </label>
  );
}
