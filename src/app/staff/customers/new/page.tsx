import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { requireRole } from "@/lib/session";
import { createStaffCustomerAction } from "@/app/staff/customers/actions";

export default async function NewStaffCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string }>;
}) {
  const user = await requireRole("STAFF");
  const params = await searchParams;

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

function Input({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} required={required} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0" />
    </label>
  );
}
