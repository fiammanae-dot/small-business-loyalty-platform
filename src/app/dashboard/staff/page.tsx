import type { RecordStatus } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StaffPasswordResetAction } from "@/components/StaffPasswordResetAction";
import {
  ActionMenu,
  ActionMenuItem,
  Avatar,
  Button,
  ButtonLink,
  EmptyState,
  MetricCard,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { createStaffUserAction, toggleStaffStatusAction } from "@/app/dashboard/actions";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { createCsrfToken } from "@/lib/csrf";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/roles";
import { AlertTriangle, Ban, Building2, CheckCircle2, Download, KeyRound, Plus, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type StaffSearchParams = { error?: string; success?: string; q?: string; branch?: string; role?: string; status?: string; sort?: string; add?: string };
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

  const buildStaffHref = (next: Partial<Record<"role" | "status", string>>) => {
    const merged = { q: params.q, branch: params.branch, role: params.role, status: params.status, sort: params.sort, ...next };
    const query = new URLSearchParams();
    if (merged.q) query.set("q", merged.q);
    if (merged.branch) query.set("branch", merged.branch);
    if (merged.role) query.set("role", merged.role);
    if (merged.status) query.set("status", merged.status);
    if (merged.sort && merged.sort !== "newest") query.set("sort", merged.sort);
    const qs = query.toString();
    return qs ? `/dashboard/staff?${qs}` : "/dashboard/staff";
  };
  const addStaffHref = "/dashboard/staff?add=1#add-staff";

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Team Management" hideWelcomeMessage>
      <div className="max-w-full min-w-0 space-y-5 overflow-x-hidden">
        <Message error={params.error} success={params.success} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[#7A8091]">Manage your staff, branch managers, and account access.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" aria-hidden />}>Export</Button>
            <ButtonLink href={addStaffHref} variant="business" leftIcon={<Plus className="h-4 w-4" aria-hidden />}>Add staff member</ButtonLink>
          </div>
        </div>

        <section aria-label="Team summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total staff" value={staffUsers.length} helper="All team accounts" icon={<Users className="h-5 w-5" />} tone="business" />
          <MetricCard label="Active" value={activeStaff} helper="Can access workspace" icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          <MetricCard label="Branch managers" value={branchManagers} helper="Elevated access" icon={<ShieldCheck className="h-5 w-5" />} tone="info" />
          <MetricCard label="Disabled" value={disabledAccounts} helper="Access blocked" icon={<Ban className="h-5 w-5" />} tone={disabledAccounts ? "danger" : "neutral"} />
          <MetricCard label="New this month" value={newThisMonth} helper="Created this month" icon={<UserPlus className="h-5 w-5" />} tone="neutral" />
        </section>

        <div className="grid gap-3">
          <form method="get" action="/dashboard/staff" className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 basis-56">
              <span className="sr-only">Search team</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
              <input name="q" defaultValue={params.q ?? ""} placeholder="Search by name, email, or role" className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm" />
            </label>
            <input type="hidden" name="role" value={params.role ?? ""} />
            <input type="hidden" name="status" value={params.status ?? ""} />
            <SelectField name="branch" label="Branch" defaultValue={params.branch ?? ""} options={[{ value: "", label: "All branches" }, ...business.branches.map((branch) => ({ value: branch.id.toString(), label: branch.name }))]} />
            <SelectField name="sort" label="Sort" defaultValue={params.sort ?? "newest"} options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }]} />
            <Button type="submit" variant="business" size="sm">Apply</Button>
            <ButtonLink href="/dashboard/staff" variant="outline" size="sm">Clear</ButtonLink>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <FilterPill href={buildStaffHref({ role: "" })} active={!params.role}>All roles</FilterPill>
            <FilterPill href={buildStaffHref({ role: "BRANCH_MANAGER" })} active={params.role === "BRANCH_MANAGER"}>Branch managers</FilterPill>
            <FilterPill href={buildStaffHref({ role: "STAFF" })} active={params.role === "STAFF"}>Staff</FilterPill>
            <span className="mx-1 h-5 w-px bg-[#E5E7EB]" aria-hidden="true" />
            <FilterPill href={buildStaffHref({ status: "" })} active={!params.status}>All statuses</FilterPill>
            <FilterPill href={buildStaffHref({ status: "ACTIVE" })} active={params.status === "ACTIVE"}>Active</FilterPill>
            <FilterPill href={buildStaffHref({ status: "INACTIVE" })} active={params.status === "INACTIVE"}>Disabled</FilterPill>
          </div>
        </div>

        <SectionCard title="Staff list" description="Review team access, branch assignment, and security status." actions={<span className="text-sm font-semibold text-[#64748B]">{filteredStaffUsers.length} shown</span>}>
          {filteredStaffUsers.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredStaffUsers.map((staffUser) => (
                <StaffCard key={staffUser.id} staffUser={staffUser} failedAttempts={failedAttemptsByEmail.get(staffUser.email) ?? 0} csrfToken={resetCsrfToken} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Users className="h-5 w-5" />} title="No staff members match these filters" description="Adjust the filters or add a new staff member to start building your team." action={<ButtonLink href={addStaffHref} variant="business" leftIcon={<Plus className="h-4 w-4" aria-hidden />}>Add staff member</ButtonLink>} />
          )}
        </SectionCard>

        <details id="add-staff" open={params.add === "1"} className="min-w-0 overflow-hidden rounded-xl border border-[#E7E9EE] bg-white shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-semibold text-[#0F172A] [&::-webkit-details-marker]:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-full business-bg-soft business-text"><Plus className="h-4 w-4" aria-hidden /></span>
            Add staff member
          </summary>
          <div className="border-t border-[#E7E9EE] p-4 md:p-5">
            <p className="mb-4 text-[13px] text-[#7A8091]">Create a secure team account, assign the role, and choose the branch where this person works.</p>
            <StaffCreateForm businessName={business.name} branches={business.branches} />
          </div>
        </details>
      </div>
    </DashboardShell>
  );
}

function StaffCard({ staffUser, failedAttempts, csrfToken }: { staffUser: StaffRow; failedAttempts: number; csrfToken: string }) {
  return (
    <article className="min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={staffUser.name} className="h-10 w-10 text-sm" />
          <div className="min-w-0">
            <a href={`/dashboard/staff/${staffUser.id}`} className="block truncate font-semibold text-[#0F172A] transition business-hover">{staffUser.name}</a>
            <p className="truncate text-xs text-[#9CA3AF]">{staffUser.email}</p>
          </div>
        </div>
        <StaffActions staffUser={staffUser} csrfToken={csrfToken} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={staffUser.role === "BRANCH_MANAGER" ? "info" : "neutral"}>{roleLabels[staffUser.role]}</StatusBadge>
        {staffStatusBadge(staffUser.status)}
        {failedAttempts > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#F7C1C1] bg-[#FCEBEB] px-2.5 py-1 text-xs font-semibold text-[#A32D2D]">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            {failedAttempts} failed login{failedAttempts === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#F1F3F5] pt-3 text-xs text-[#6B7280]">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{staffUser.branch?.name ?? "Unassigned"}</span>
        </span>
        <span className="shrink-0">Last login {staffUser.lastLoginAt ? formatDate(staffUser.lastLoginAt) : "Never"}</span>
      </div>
    </article>
  );
}

function StaffActions({ staffUser, csrfToken }: { staffUser: StaffRow; csrfToken: string }) {
  const nextStatus = staffUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return <ActionMenu label="Actions"><ActionMenuItem><ButtonLink href={`/dashboard/staff/${staffUser.id}`} variant="ghost" size="sm" className="w-full justify-start">View</ButtonLink></ActionMenuItem><ActionMenuItem><StaffPasswordResetAction staffUserId={staffUser.id} staffName={staffUser.name} csrfToken={csrfToken} /></ActionMenuItem><ActionMenuItem danger={nextStatus !== "ACTIVE"}><form action={toggleStaffStatusAction}><CsrfInput scope="dashboard:staff" /><input type="hidden" name="staffUserId" value={staffUser.id} /><input type="hidden" name="nextStatus" value={nextStatus} />{nextStatus === "ACTIVE" ? <button type="submit" className="inline-flex h-9 w-full cursor-pointer items-center justify-start gap-2 rounded-md px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Enable</button> : <ConfirmSubmitButton message="Disable this user? They will lose access to the business workspace." className="inline-flex h-9 w-full cursor-pointer items-center justify-start gap-2 rounded-md px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/25"><Ban className="h-3.5 w-3.5" aria-hidden="true" />Disable</ConfirmSubmitButton>}</form></ActionMenuItem></ActionMenu>;
}

function StaffCreateForm({ businessName, branches }: { businessName: string; branches: Array<{ id: number; name: string; status: RecordStatus }> }) {
  return <form action={createStaffUserAction} className="grid min-w-0 gap-4"><CsrfInput scope="dashboard:staff" /><div className="grid gap-4 md:grid-cols-3"><fieldset className="grid gap-3 rounded-md border border-[#E2E8F0] p-4"><legend className="px-1 text-sm font-semibold text-[#1E293B]">Personal Information</legend><Input label="Full name" name="name" /><Input label="Email" name="email" type="email" /></fieldset><fieldset className="grid gap-3 rounded-md border border-[#E2E8F0] p-4"><legend className="px-1 text-sm font-semibold text-[#1E293B]">Role and Branch Assignment</legend><label className="min-w-0 space-y-1.5"><span className="text-sm font-medium text-[#111827]">Role</span><select name="role" className="h-11 w-full max-w-full min-w-0 rounded-md border border-[#E5E7EB] px-3 text-sm"><option value="BRANCH_MANAGER">Branch Manager</option><option value="STAFF">Staff</option></select></label><SearchableCombobox label="Branch assignment" name="branchId" placeholder="Search branches" emptyLabel="No branches found." required options={branches.map((branch) => ({ value: branch.id.toString(), label: branch.name, description: businessName, badge: branch.status === "ACTIVE" ? "Active" : "Inactive", disabled: branch.status !== "ACTIVE" }))} /></fieldset><fieldset className="grid gap-3 rounded-md border border-[#E2E8F0] p-4"><legend className="px-1 text-sm font-semibold text-[#1E293B]">Password and Review</legend><Input label="Temporary password" name="password" type="password" /><p className="text-sm leading-6 text-[#64748B]">The user will use this temporary password and can be required to update it after first login.</p><Button type="submit" variant="business" className="self-end" leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}>Save Staff Member</Button></fieldset></div></form>;
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold transition ${active ? "business-button text-white" : "border border-[#E5E7EB] bg-white text-[#6B7280] business-hover"}`}>
      {children}
    </Link>
  );
}

function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: Array<{ value: string; label: string }> }) {
  return <label className="min-w-0"><span className="sr-only">{label}</span><select name={name} defaultValue={defaultValue} className="h-10 rounded-md border border-[#CBD5E1] bg-white px-3 text-sm">{options.map((option) => <option key={`${name}-${option.value}`} value={option.value}>{option.label}</option>)}</select></label>;
}
function Input({ label, name, type = "text" }: { label: string; name: string; type?: string }) { return <label className="min-w-0 space-y-1.5"><span className="text-sm font-medium text-[#111827]">{label}</span><input name={name} type={type} required className="h-11 w-full max-w-full min-w-0 rounded-md border border-[#E5E7EB] px-3 text-sm outline-none business-ring focus:ring-0 business-border" /></label>; }
function staffStatusBadge(status: "ACTIVE" | "INACTIVE") { return status === "ACTIVE" ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="danger">Disabled</StatusBadge>; }
function Message({ error, success }: { error?: string; success?: string }) { if (!error && !success) return null; return <p className={`rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>; }
