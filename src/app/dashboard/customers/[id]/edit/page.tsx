import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { getBusinessCustomerOrRedirect } from "@/lib/customers";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { formatUaePhoneDisplay } from "@/lib/phone";
import { updateCustomerAction } from "@/app/dashboard/actions";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  const membership = await getBusinessCustomerOrRedirect(id, user.businessId);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Edit customer">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        {qs.error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{qs.error}</p> : null}
        <form action={updateCustomerAction} className="grid gap-5">
          <CsrfInput scope="dashboard:customers" />
          <input type="hidden" name="membershipUuid" value={membership.uuid} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="firstName" label="First name" defaultValue={membership.firstName} required />
            <Input name="lastName" label="Last name" defaultValue={membership.lastName ?? ""} />
            <Input name="phone" label="Phone" defaultValue={formatUaePhoneDisplay(membership.normalizedPhone)} required />
            <Input name="email" label="Email" type="email" defaultValue={membership.email ?? ""} />
            <Input
              name="birthday"
              label="Birthday"
              type="date"
              defaultValue={membership.birthday ? membership.birthday.toISOString().slice(0, 10) : ""}
            />
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#111827]">Status</span>
              <select name="status" defaultValue={membership.status} className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#111827]">
            <input type="checkbox" name="marketingConsent" defaultChecked={membership.marketingConsent} className="h-4 w-4 rounded border-[#E5E7EB]" />
            Marketing consent
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Notes</span>
            <textarea name="notes" rows={4} defaultValue={membership.notes ?? ""} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none business-ring focus:ring-0" />
          </label>
          <div className="flex gap-3">
            <button type="submit" className="rounded-md business-button px-4 py-2 text-sm font-semibold">
              Save customer
            </button>
            <Link href={`/dashboard/customers/${membership.uuid}`} className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}

function Input({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  disabled = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0 disabled:bg-zinc-50 disabled:text-[#6B7280]"
      />
    </label>
  );
}
