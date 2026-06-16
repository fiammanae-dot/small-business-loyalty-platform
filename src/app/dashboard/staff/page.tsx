import { DashboardShell } from "@/components/DashboardShell";
import Link from "next/link";
import { CsrfInput } from "@/components/CsrfInput";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StaffPasswordResetAction } from "@/components/StaffPasswordResetAction";
import { StatusBadge } from "@/components/StatusBadge";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { createCsrfToken } from "@/lib/csrf";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/roles";
import { createStaffUserAction, toggleStaffStatusAction } from "@/app/dashboard/actions";

export default async function StaffUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;
  const resetCsrfToken = createCsrfToken("dashboard:staff");
  const staffEmails = business.users.map((staffUser) => staffUser.email);
  const failedSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const failedLoginCounts = staffEmails.length
    ? await prisma.failedLoginAudit.groupBy({
        by: ["emailAttempted"],
        where: {
          emailAttempted: { in: staffEmails },
          outcome: { in: ["FAILED", "LOCKED"] },
          createdAt: { gte: failedSince },
        },
        _count: { _all: true },
      })
    : [];
  const failedAttemptsByEmail = new Map(failedLoginCounts.map((item) => [item.emailAttempted, item._count._all]));

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Staff users">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <Message error={params.error} success={params.success} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Staff list</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Create and manage Branch Manager and Staff access.</p>
          </div>
          <details className="group">
            <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">
              Add user
            </summary>
            <div className="absolute right-6 z-20 mt-2 w-[min(920px,calc(100vw-3rem))] rounded-md border border-[#E5E7EB] bg-white p-4 shadow-xl">
              <StaffCreateForm businessName={business.name} branches={business.branches} />
            </div>
          </details>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Name", "Email", "Role", "Branch", "Status", "Security", "Created", "Actions"].map((heading) => (
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
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-xs text-[#6B7280]">
                      <p>Last login: {staffUser.lastLoginAt ? formatDate(staffUser.lastLoginAt) : "-"}</p>
                      <p>Password changed: {formatDate(staffUser.passwordChangedAt)}</p>
                      <p>Failed attempts 24h: {failedAttemptsByEmail.get(staffUser.email) ?? 0}</p>
                      {staffUser.forcePasswordChange ? <p className="font-semibold text-[#F97316]">Password change required</p> : null}
                    </td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4 text-[#6B7280]">{formatDate(staffUser.createdAt)}</td>
                    <td className="border-b border-[#E5E7EB] px-3 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <StaffPasswordResetAction staffUserId={staffUser.id} staffName={staffUser.name} csrfToken={resetCsrfToken} />
                        <form action={toggleStaffStatusAction}>
                          <CsrfInput scope="dashboard:staff" />
                          <input type="hidden" name="staffUserId" value={staffUser.id} />
                          <input type="hidden" name="nextStatus" value={nextStatus} />
                          <button type="submit" className="text-sm font-semibold text-[#F97316]">
                            {nextStatus === "ACTIVE" ? "Enable" : "Disable"}
                          </button>
                        </form>
                      </div>
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

function StaffCreateForm({
  businessName,
  branches,
}: {
  businessName: string;
  branches: Array<{ id: number; name: string; status: "ACTIVE" | "INACTIVE" }>;
}) {
  return (
    <form action={createStaffUserAction} className="grid gap-4 md:grid-cols-3">
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
        options={branches.map((branch) => ({
          value: branch.id.toString(),
          label: branch.name,
          description: businessName,
          badge: branch.status === "ACTIVE" ? "Active" : "Inactive",
          disabled: branch.status !== "ACTIVE",
        }))}
      />
      <button type="submit" className="h-11 self-end rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">
        Add user
      </button>
    </form>
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
