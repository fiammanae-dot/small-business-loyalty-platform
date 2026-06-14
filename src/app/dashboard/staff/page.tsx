import { DashboardShell } from "@/components/DashboardShell";
import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { roleLabels } from "@/lib/roles";
import { createStaffUserAction, toggleStaffStatusAction } from "@/app/dashboard/actions";

export default async function StaffUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Staff users">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <Message error={params.error} success={params.success} />
        <h2 className="text-lg font-semibold text-[#111827]">Create staff user</h2>
        <form action={createStaffUserAction} className="mt-5 grid gap-4 md:grid-cols-3">
          <CsrfInput scope="dashboard:staff" />
          <Input label="Full name" name="name" />
          <Input label="Email" name="email" type="email" />
          <Input label="Temporary password" name="password" type="password" />
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#111827]">Role</span>
            <select name="role" className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm">
              <option value="BRANCH_MANAGER">Branch Manager</option>
              <option value="STAFF">Staff</option>
            </select>
          </label>
          <SearchableCombobox
            label="Branch assignment"
            name="branchId"
            placeholder="Search branches"
            emptyLabel="No branches found."
            required
            options={business.branches.map((branch) => ({
              value: branch.id.toString(),
              label: branch.name,
              description: business.name,
              badge: branch.status === "ACTIVE" ? "Active" : "Inactive",
              disabled: branch.status !== "ACTIVE",
            }))}
          />
          <button type="submit" className="h-11 self-end rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">
            Add user
          </button>
        </form>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#111827]">Staff list</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Name", "Email", "Role", "Branch", "Status", "Created", "Actions"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {business.users.map((staffUser) => {
                const nextStatus = staffUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                return (
                  <tr key={staffUser.id} className="align-top">
                    <td className="border-b border-[#E5E7EB] px-3 py-4 font-semibold">
                      <Link href={`/dashboard/staff/${staffUser.id}`} className="text-[#111827] transition hover:text-[#F97316]">
                        {staffUser.name}
                      </Link>
                    </td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{staffUser.email}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{roleLabels[staffUser.role]}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{staffUser.branch?.name ?? "-"}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4"><StatusBadge status={staffUser.status} /></td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(staffUser.createdAt)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4">
                      <form action={toggleStaffStatusAction}>
                        <CsrfInput scope="dashboard:staff" />
                        <input type="hidden" name="staffUserId" value={staffUser.id} />
                        <input type="hidden" name="nextStatus" value={nextStatus} />
                        <button type="submit" className="text-sm font-semibold text-[#F97316]">
                          {nextStatus === "ACTIVE" ? "Enable" : "Disable"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {business.users.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No staff users yet.</p> : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function Input({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input name={name} type={type} required className="h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100" />
    </label>
  );
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`mb-5 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>;
}
