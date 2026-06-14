import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { createCustomerAction } from "@/app/dashboard/actions";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Enroll customer">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {params.error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p> : null}
        <form action={createCustomerAction} className="grid gap-5">
          <CsrfInput scope="dashboard:customers" />
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name" />
            <Input name="phone" label="Phone" required />
            <Input name="email" label="Email" type="email" />
            <Input name="birthday" label="Birthday" type="date" />
            <SearchableCombobox
              label="Card issued branch"
              name="createdBranchId"
              placeholder="No branch selected"
              emptyLabel="No branches found."
              options={[
                { value: "", label: "No branch selected", description: "Enroll without branch attribution" },
                ...business.branches.map((branch) => ({
                  value: branch.id.toString(),
                  label: branch.name,
                  description: business.name,
                  badge: branch.status === "ACTIVE" ? "Active" : "Inactive",
                  disabled: branch.status !== "ACTIVE",
                })),
              ]}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#111827]">
            <input type="checkbox" name="marketingConsent" className="h-4 w-4 rounded border-[#E5E7EB]" />
            Marketing consent
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Referral code or link</span>
            <input name="referralCode" defaultValue={params.ref ?? ""} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Notes</span>
            <textarea name="notes" rows={4} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
          </label>
          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white">
              Enroll customer
            </button>
            <Link href="/dashboard/customers" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
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
      <input name={name} type={type} required={required} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
    </label>
  );
}
