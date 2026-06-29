import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StaffPasswordResetAction } from "@/components/StaffPasswordResetAction";
import {
  ActionMenu,
  ActionMenuItem,
  Button,
  ButtonLink,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  FilterBar,
  MetricCard,
  PageIntro,
  SearchBar,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { createStaffUserAction, toggleStaffStatusAction } from "@/app/dashboard/actions";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { createCsrfToken } from "@/lib/csrf";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/roles";
import { Ban, CheckCircle2, Download, KeyRound, Plus, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";

type StaffSearchParams = { error?: string; success?: string; q?: string; branch?: string; role?: string; status?: string; sort?: string };
type StaffRow = { id: number; name: string; email: string; role: "BRANCH_MANAGER" | "STAFF"; status: "ACTIVE" | "INACTIVE"; createdAt: Date; lastLoginAt: Date | null; branch?: { id: number; name: string } | null };

export default async function StaffUsersPage({ searchParams }: { searchParams: Promise<StaffSearchParams> }) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;
  const resetCsrfToken = createCsrfToken("dashboard:staff");
  const staffEmails = business.users.map((staffUser) => staffUser.email);
  const failedSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const failedLoginCounts = staffEmails.length
    ? await prisma.failedLoginAudit.groupBy({
        by: ["emailAttempted"],
        where: { emailAttempted: { in: staffEmails }, outcome: { in: ["FAILED", "LOCKED"] }, createdAt: { gte: failedSince } },
        _count: { _all: true },
      })
    : [];
  const failedAttemptsByEmail = new Map(failedLoginCounts.map((item) => [item.emailAttempted, item._count._all]));
  const staffUsers = business.users as StaffRow[];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const filteredStaffUsers = staffUsers
    .filter((staffUser) => {
      const query = params.q?.trim().toLowerCase();
      const matchesSearch = query
        ? [staffUser.name, staffUser.email, roleLabels[staffUser.role], staffUser.branch?.name, staffUser.status].filter(Boolean).some((value) => value?.toLowerCase().includes(query))
        : true;
      return matchesSearch && (!params.branch || staffUser.branch?.id.toString() === params.branch) && (!params.role || staffUser.role === params.role) && (!params.status || staffUser.status === params.status);
    })
    .sort((a, b) => (params.sort === "oldest" ? a.createdAt.getTime() - b.createdAt.getTime() : b.createdAt.getTime() - a.createdAt.getTime()));

  const activeStaff = staffUsers.filter((staffUser) => staffUser.status === "ACTIVE").length;
  const branchManagers = staffUsers.filter((staffUser) => staffUser.role === "BRANCH_MANAGER").length;
  const disabledAccounts = staffUsers.filter((staffUser) => staffUser.status !== "ACTIVE").length;
  const newThisMonth = staffUsers.filter((staffUser) => staffUser.createdAt >= monthStart).length;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Team Management" hideWelcomeMessage>
      <div className="max-w-full min-w-0 space-y-5 overflow-x-hidden">
        <Message error={params.error} success={params.success} />
        <PageIntro
          eyebrow="Business Owner"
          description="Manage your staff, branch managers and account access."
          actions={
            <>
              <ButtonLink href="#add-staff" variant="business" leftIcon={<Plus className="h-4 w-4" aria-hidden />}>Add Staff Member</ButtonLink>
              <Button variant="outline" leftIcon={<Download className="h-4 w-4" aria-hidden />}>Export Staff</Button>
            </>
          }
        />
        <section aria-label="Team summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total Staff" value={staffUsers.length} helper="All team accounts" icon={<Users className="h-5 w-5" />} tone="business" />
          <MetricCard label="Active Staff" value={activeStaff} helper="Can access workspace" tone="success" />
          <MetricCard label="Branch Managers" value={branchManagers} helper="Elevated branch access" icon={<ShieldCheck className="h-5 w-5" />} tone="info" />
          <MetricCard label="Disabled Accounts" value={disabledAccounts} helper="Access blocked" tone={disabledAccounts ? "danger" : "neutral"} />
          <MetricCard label="New Staff This Month" value={newThisMonth} helper="Created this month" tone="neutral" />
        </section>
        <SectionCard title="Find team members" description="Search and filter staff by branch, role, account status or recency.">
          <FilterBar method="get" title="Team filters" actions={<><Button type="submit" variant="business" size="sm">Apply</Button><ButtonLink href="/dashboard/staff" variant="outline" size="sm">Clear</ButtonLink></>} className="border-0 bg-transparent p-0">
            <div className="md:col-span-2 xl:col-span-2"><SearchBar name="q" label="Search" defaultValue={params.q ?? ""} placeholder="Search by name, email, phone or role..." /></div>
            <SelectField label="Branch" name="branch" defaultValue={params.branch ?? ""} options={[{ value: "", label: "All branches" }, ...business.branches.map((branch) => ({ value: branch.id.toString(), label: branch.name }))]} />
            <SelectField label="Role" name="role" defaultValue={params.role ?? ""} options={[{ value: "", label: "All roles" }, { value: "BRANCH_MANAGER", label: "Branch Manager" }, { value: "STAFF", label: "Staff" }]} />
            <SelectField label="Status" name="status" defaultValue={params.status ?? ""} options={[{ value: "", label: "All statuses" }, { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Disabled" }]} />
            <SelectField label="Recently Added" name="sort" defaultValue={params.sort ?? "newest"} options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }]} />
          </FilterBar>
        </SectionCard>
        <SectionCard title="Staff List" description="Review team access, branch assignment and security status." actions={<span className="text-sm font-semibold text-[#64748B]">{filteredStaffUsers.length} shown</span>}>
          {filteredStaffUsers.length ? <StaffDirectory staffUsers={filteredStaffUsers} failedAttemptsByEmail={failedAttemptsByEmail} csrfToken={resetCsrfToken} /> : <EmptyState icon={<Users className="h-5 w-5" />} title="No staff members match these filters" description="Adjust the filters or add a new staff member to start building your team." action={<ButtonLink href="#add-staff" variant="business" leftIcon={<Plus className="h-4 w-4" aria-hidden />}>Add Staff Member</ButtonLink>} />}
        </SectionCard>
        <SectionCard id="add-staff" title="Add Staff Member" description="Create a secure team account, assign the role and choose the branch where this person works.">
          <StaffCreateForm businessName={business.name} branches={business.branches} />
        </SectionCard>
      </div>
    </DashboardShell>
  );
}

function StaffDirectory({ staffUsers, failedAttemptsByEmail, csrfToken }: { staffUsers: StaffRow[]; failedAttemptsByEmail: Map<string, number>; csrfToken: string }) {
  return <>
    <div className="hidden lg:block"><DataTable><DataTableHeader><tr>{["Employee", "Role", "Assigned Branch", "Status", "Last Login", "Actions"].map((heading) => <DataTableHeadCell key={heading}>{heading}</DataTableHeadCell>)}</tr></DataTableHeader><DataTableBody>{staffUsers.map((staffUser) => <tr key={staffUser.id}><DataTableCell><div className="min-w-0"><a href={`/dashboard/staff/${staffUser.id}`} className="font-semibold text-[#0F172A] transition business-hover">{staffUser.name}</a><p className="mt-1 break-words text-xs text-[#64748B]">{staffUser.email}</p></div></DataTableCell><DataTableCell><StatusBadge tone={staffUser.role === "BRANCH_MANAGER" ? "info" : "neutral"}>{roleLabels[staffUser.role]}</StatusBadge></DataTableCell><DataTableCell>{staffUser.branch?.name ?? "Unassigned"}</DataTableCell><DataTableCell>{staffStatusBadge(staffUser.status)}</DataTableCell><DataTableCell><div className="text-sm"><p>{staffUser.lastLoginAt ? formatDate(staffUser.lastLoginAt) : "Never"}</p><p className="mt-1 text-xs text-[#64748B]">Failed attempts 24h: {failedAttemptsByEmail.get(staffUser.email) ?? 0}</p></div></DataTableCell><DataTableCell><StaffActions staffUser={staffUser} csrfToken={csrfToken} /></DataTableCell></tr>)}</DataTableBody></DataTable></div>
    <div className="grid gap-3 lg:hidden">{staffUsers.map((staffUser) => <article key={staffUser.id} className="rounded-md border border-[#E2E8F0] bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><a href={`/dashboard/staff/${staffUser.id}`} className="font-semibold text-[#0F172A] transition business-hover">{staffUser.name}</a><p className="mt-1 break-words text-sm text-[#64748B]">{staffUser.email}</p></div>{staffStatusBadge(staffUser.status)}</div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><InfoLine label="Role" value={roleLabels[staffUser.role]} /><InfoLine label="Branch" value={staffUser.branch?.name ?? "Unassigned"} /><InfoLine label="Last login" value={staffUser.lastLoginAt ? formatDate(staffUser.lastLoginAt) : "Never"} /><InfoLine label="Failed attempts" value={failedAttemptsByEmail.get(staffUser.email) ?? 0} /></div><div className="mt-4"><StaffActions staffUser={staffUser} csrfToken={csrfToken} align="left" /></div></article>)}</div>
  </>;
}

function StaffActions({ staffUser, csrfToken, align = "right" }: { staffUser: StaffRow; csrfToken: string; align?: "left" | "right" }) {
  const nextStatus = staffUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return <ActionMenu label="Actions" className={align === "left" ? "[&_div]:left-0 [&_div]:right-auto" : undefined}><ActionMenuItem><ButtonLink href={`/dashboard/staff/${staffUser.id}`} variant="ghost" size="sm" className="w-full justify-start">View</ButtonLink></ActionMenuItem><ActionMenuItem><StaffPasswordResetAction staffUserId={staffUser.id} staffName={staffUser.name} csrfToken={csrfToken} /></ActionMenuItem><ActionMenuItem danger={nextStatus !== "ACTIVE"}><form action={toggleStaffStatusAction}><CsrfInput scope="dashboard:staff" /><input type="hidden" name="staffUserId" value={staffUser.id} /><input type="hidden" name="nextStatus" value={nextStatus} />{nextStatus === "ACTIVE" ? <button type="submit" className="inline-flex h-9 w-full cursor-pointer items-center justify-start gap-2 rounded-md px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Enable</button> : <ConfirmSubmitButton message="Disable this user? They will lose access to the business workspace." className="inline-flex h-9 w-full cursor-pointer items-center justify-start gap-2 rounded-md px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/25"><Ban className="h-3.5 w-3.5" aria-hidden="true" />Disable</ConfirmSubmitButton>}</form></ActionMenuItem></ActionMenu>;
}

function StaffCreateForm({ businessName, branches }: { businessName: string; branches: Array<{ id: number; name: string; status: "ACTIVE" | "INACTIVE" }> }) {
  return <form action={createStaffUserAction} className="grid min-w-0 gap-4"><CsrfInput scope="dashboard:staff" /><div className="grid gap-4 md:grid-cols-3"><fieldset className="grid gap-3 rounded-md border border-[#E2E8F0] p-4"><legend className="px-1 text-sm font-semibold text-[#1E293B]">Personal Information</legend><Input label="Full name" name="name" /><Input label="Email" name="email" type="email" /></fieldset><fieldset className="grid gap-3 rounded-md border border-[#E2E8F0] p-4"><legend className="px-1 text-sm font-semibold text-[#1E293B]">Role and Branch Assignment</legend><label className="min-w-0 space-y-1.5"><span className="text-sm font-medium text-[#111827]">Role</span><select name="role" className="h-11 w-full max-w-full min-w-0 rounded-md border border-[#E5E7EB] px-3 text-sm"><option value="BRANCH_MANAGER">Branch Manager</option><option value="STAFF">Staff</option></select></label><SearchableCombobox label="Branch assignment" name="branchId" placeholder="Search branches" emptyLabel="No branches found." required options={branches.map((branch) => ({ value: branch.id.toString(), label: branch.name, description: businessName, badge: branch.status === "ACTIVE" ? "Active" : "Inactive", disabled: branch.status !== "ACTIVE" }))} /></fieldset><fieldset className="grid gap-3 rounded-md border border-[#E2E8F0] p-4"><legend className="px-1 text-sm font-semibold text-[#1E293B]">Password and Review</legend><Input label="Temporary password" name="password" type="password" /><p className="text-sm leading-6 text-[#64748B]">The user will use this temporary password and can be required to update it after first login.</p><Button type="submit" variant="business" className="self-end" leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}>Save Staff Member</Button></fieldset></div></form>;
}

function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: Array<{ value: string; label: string }> }) {
  return <label className="block min-w-0 text-sm font-medium text-[#1E293B]"><span>{label}</span><select name={name} defaultValue={defaultValue} className="mt-1 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm">{options.map((option) => <option key={`${name}-${option.value}`} value={option.value}>{option.label}</option>)}</select></label>;
}
function Input({ label, name, type = "text" }: { label: string; name: string; type?: string }) { return <label className="min-w-0 space-y-1.5"><span className="text-sm font-medium text-[#111827]">{label}</span><input name={name} type={type} required className="h-11 w-full max-w-full min-w-0 rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0 business-border" /></label>; }
function InfoLine({ label, value }: { label: string; value: ReactNode }) { return <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</p><p className="mt-1 break-words font-semibold text-[#0F172A]">{value}</p></div>; }
function staffStatusBadge(status: "ACTIVE" | "INACTIVE") { return status === "ACTIVE" ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="danger">Disabled</StatusBadge>; }
function Message({ error, success }: { error?: string; success?: string }) { if (!error && !success) return null; return <p className={`rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>; }
