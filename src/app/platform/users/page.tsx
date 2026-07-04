import type { Prisma, RecordStatus, UserRole } from "@prisma/client";
import { ChevronRight, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { ButtonLink, DataTable, DataTableBody, DataTableCell, DataTableHeader, EmptyState, SortableHeadCell } from "@/components/ui";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getDisplayUserName, roleLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";

type UsersSearchParams = {
  name?: string;
  email?: string;
  role?: string;
  business?: string;
  branch?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: string;
  direction?: string;
  suspect?: string;
};

const validRoles = ["PLATFORM_OWNER", "BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"] as const;
const validStatuses: RecordStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED", "ARCHIVED"];
const sortableFields = {
  name: "Name",
  email: "Email",
  role: "Role",
  business: "Business",
  branch: "Branch",
  status: "Status",
  createdAt: "Created date",
} as const;
const suspiciousUserPattern = /(demo|test|phase|debug|\d{10,})/i;

type UserWithListData = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    role: true;
    status: true;
    createdAt: true;
    business: { select: { id: true; name: true } };
    branch: { select: { id: true; name: true } };
  };
}>;

function getParam(params: UsersSearchParams, key: keyof UsersSearchParams) {
  return typeof params[key] === "string" ? params[key]?.trim() ?? "" : "";
}

function parseNumber(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseDate(value: string, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildQuickFilterHref(overrides: UsersSearchParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(overrides)) {
    if (value) {
      params.set(key, value);
    }
  }

  return `/platform/users${params.toString() ? `?${params.toString()}` : ""}`;
}

function buildSortHref(params: UsersSearchParams, field: keyof typeof sortableFields, currentSort: string, currentDirection: string) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      query.set(key, value);
    }
  }

  const nextDirection = currentSort === field ? (currentDirection === "asc" ? "desc" : "asc") : field === "createdAt" ? "desc" : "asc";
  query.set("sort", field);
  query.set("direction", nextDirection);

  return `/platform/users?${query.toString()}`;
}

function isSuspiciousUser(user: UserWithListData) {
  return [user.name, user.email, user.business?.name ?? ""].some((value) => suspiciousUserPattern.test(value));
}

export default async function PlatformUsersPage({
  searchParams,
}: {
  searchParams: Promise<UsersSearchParams>;
}) {
  const currentUser = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;
  const name = getParam(params, "name");
  const email = getParam(params, "email");
  const selectedRole = validRoles.includes(params.role as UserRole) ? (params.role as UserRole) : "";
  const selectedStatus = validStatuses.includes(params.status as RecordStatus) ? (params.status as RecordStatus) : "";
  const selectedBusinessId = parseNumber(getParam(params, "business"));
  const selectedBranchId = parseNumber(getParam(params, "branch"));
  const createdFrom = parseDate(getParam(params, "createdFrom"));
  const createdTo = parseDate(getParam(params, "createdTo"), true);
  const sort = Object.keys(sortableFields).includes(params.sort ?? "") ? (params.sort as keyof typeof sortableFields) : "createdAt";
  const direction = params.direction === "asc" ? "asc" : "desc";
  const suspectOnly = params.suspect === "1";
  const hasAdvancedFilters = Boolean(
    selectedBusinessId || selectedBranchId || getParam(params, "createdFrom") || getParam(params, "createdTo"),
  );
  const activeFilterCount = [
    name,
    email,
    selectedRole,
    selectedStatus,
    selectedBusinessId,
    selectedBranchId,
    getParam(params, "createdFrom"),
    getParam(params, "createdTo"),
    suspectOnly ? "1" : "",
  ].filter(Boolean).length;

  const createdAt: Prisma.DateTimeFilter = {};
  if (createdFrom) {
    createdAt.gte = createdFrom;
  }
  if (createdTo) {
    createdAt.lte = createdTo;
  }

  const where: Prisma.UserWhereInput = {
    ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
    ...(email ? { email: { contains: email, mode: "insensitive" } } : {}),
    ...(selectedRole ? { role: selectedRole } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(selectedBusinessId ? { businessId: selectedBusinessId } : {}),
    ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
    ...(createdFrom || createdTo ? { createdAt } : {}),
  };

  const [businesses, branches, allUsers] = await Promise.all([
    prisma.business.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, business: { select: { name: true } } } }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        business: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    }),
  ]);

  const users = allUsers
    .filter((user) => (selectedStatus ? true : user.status !== "ARCHIVED"))
    .filter((user) => (suspectOnly ? isSuspiciousUser(user) : true))
    .sort((a, b) => {
      const multiplier = direction === "asc" ? 1 : -1;

      if (sort === "name") {
        return getDisplayUserName(a).localeCompare(getDisplayUserName(b)) * multiplier;
      }
      if (sort === "email") {
        return a.email.localeCompare(b.email) * multiplier;
      }
      if (sort === "role") {
        return roleLabels[a.role].localeCompare(roleLabels[b.role]) * multiplier;
      }
      if (sort === "business") {
        return (a.business?.name ?? "").localeCompare(b.business?.name ?? "") * multiplier;
      }
      if (sort === "branch") {
        return (a.branch?.name ?? "").localeCompare(b.branch?.name ?? "") * multiplier;
      }
      if (sort === "status") {
        return a.status.localeCompare(b.status) * multiplier;
      }

      return (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier;
    });

  return (
    <DashboardShell user={currentUser} eyebrow="System Administrator" title="System users">
      <section>
        <p className="text-sm text-[#7A8091]">Search, filter, and review user access across businesses and branches.</p>
      </section>

      <MobileFilterDrawer activeCount={activeFilterCount}>
        <form className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#171A21]">
            <SlidersHorizontal className="h-4 w-4 text-[var(--accent-deep)]" aria-hidden="true" />
            Filters
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(180px,1.2fr)_minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(140px,1fr)_auto_auto] lg:items-end">
            <label className="text-sm font-medium text-[#171A21]">
              Search name
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-3 transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-soft)]">
                <Search className="h-4 w-4 text-[#7A8091]" aria-hidden="true" />
                <input name="name" defaultValue={name} placeholder="Full name" className="h-11 w-full bg-transparent text-sm outline-none sm:h-10" />
              </div>
            </label>

            <label className="text-sm font-medium text-[#171A21]">
              Search email
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-3 transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-soft)]">
                <Search className="h-4 w-4 text-[#7A8091]" aria-hidden="true" />
                <input name="email" defaultValue={email} placeholder="Email address" className="h-11 w-full bg-transparent text-sm outline-none sm:h-10" />
              </div>
            </label>

            <SelectField label="Role" name="role" defaultValue={selectedRole}>
              <option value="">All roles</option>
              {validRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </SelectField>

            <SelectField label="Status" name="status" defaultValue={selectedStatus}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="ARCHIVED">Archived</option>
            </SelectField>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#171A21] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4352] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              Apply
            </button>
            <Link
              href="/platform/users"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          </div>

          <details className="mt-4 rounded-lg border border-[var(--medium-gray)] bg-white" open={hasAdvancedFilters}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-[#171A21] transition hover:bg-[var(--light-gray)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <span>Advanced filters</span>
              <span className="text-xs font-medium text-[#7A8091]">Business, branch, dates, sorting</span>
            </summary>
            <div className="border-t border-[var(--medium-gray)] p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <SearchableCombobox
                  label="Business"
                  name="business"
                  defaultValue={selectedBusinessId?.toString() ?? ""}
                  placeholder="All businesses"
                  emptyLabel="No businesses found."
                  options={[
                    { value: "", label: "All businesses", description: "Show users from every business" },
                    ...businesses.map((business) => ({ value: business.id.toString(), label: business.name, description: "Business" })),
                  ]}
                />

                <SearchableCombobox
                  label="Branch"
                  name="branch"
                  defaultValue={selectedBranchId?.toString() ?? ""}
                  placeholder="All branches"
                  emptyLabel="No branches found."
                  options={[
                    { value: "", label: "All branches", description: "Show users from every branch" },
                    ...branches.map((branch) => ({ value: branch.id.toString(), label: branch.name, description: branch.business.name, badge: "Branch" })),
                  ]}
                />

                <InputField label="Created from" name="createdFrom" type="date" defaultValue={getParam(params, "createdFrom")} />
                <InputField label="Created to" name="createdTo" type="date" defaultValue={getParam(params, "createdTo")} />

                <SelectField label="Sort by" name="sort" defaultValue={sort}>
                  {Object.entries(sortableFields).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>

                <SelectField label="Direction" name="direction" defaultValue={direction}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </SelectField>
              </div>
            </div>
          </details>

          {suspectOnly ? <input type="hidden" name="suspect" value="1" /> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <QuickChip href="/platform/users" label="All users" active={!selectedRole && !selectedStatus && !suspectOnly} />
            <QuickChip href={buildQuickFilterHref({ role: "PLATFORM_OWNER" })} label="System Administrators" active={selectedRole === "PLATFORM_OWNER"} />
            <QuickChip href={buildQuickFilterHref({ role: "BUSINESS_OWNER" })} label="Business Owners" active={selectedRole === "BUSINESS_OWNER"} />
            <QuickChip href={buildQuickFilterHref({ role: "BRANCH_MANAGER" })} label="Branch Managers" active={selectedRole === "BRANCH_MANAGER"} />
            <QuickChip href={buildQuickFilterHref({ role: "STAFF" })} label="Staff" active={selectedRole === "STAFF"} />
            <QuickChip href={buildQuickFilterHref({ status: "ACTIVE" })} label="Active" active={selectedStatus === "ACTIVE"} />
            <QuickChip href={buildQuickFilterHref({ status: "INACTIVE" })} label="Inactive" active={selectedStatus === "INACTIVE"} />
            <QuickChip href={buildQuickFilterHref({ status: "SUSPENDED" })} label="Suspended" active={selectedStatus === "SUSPENDED"} />
            <QuickChip href={buildQuickFilterHref({ status: "ARCHIVED" })} label="Archived" active={selectedStatus === "ARCHIVED"} />
            <QuickChip href={buildQuickFilterHref({ suspect: "1" })} label="Review flagged" active={suspectOnly} />
          </div>
        </form>
      </MobileFilterDrawer>

      <section aria-label="User results" className="grid gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#171A21]">Showing {users.length} users</p>
          <p className="text-xs text-[#7A8091]">Archived users are hidden unless the Archived filter is selected.</p>
        </div>

        <div className="hidden lg:block">
          <DataTable className="min-w-[960px]">
            <DataTableHeader>
              <tr>
                <SortableHeadCell href={buildSortHref(params, "name", sort, direction)} active={sort === "name"} direction={direction} className="w-[24%] pl-4">User</SortableHeadCell>
                <SortableHeadCell href={buildSortHref(params, "role", sort, direction)} active={sort === "role"} direction={direction} className="w-[19%]">Role</SortableHeadCell>
                <SortableHeadCell href={buildSortHref(params, "business", sort, direction)} active={sort === "business"} direction={direction}>Business</SortableHeadCell>
                <SortableHeadCell href={buildSortHref(params, "branch", sort, direction)} active={sort === "branch"} direction={direction} className="w-[13%]">Branch</SortableHeadCell>
                <SortableHeadCell href={buildSortHref(params, "status", sort, direction)} active={sort === "status"} direction={direction} className="w-[10%]">Status</SortableHeadCell>
                <SortableHeadCell href={buildSortHref(params, "createdAt", sort, direction)} active={sort === "createdAt"} direction={direction} className="w-[12%] whitespace-nowrap">Created</SortableHeadCell>
                <th className="w-8 pr-4">
                  <span className="sr-only">Open user</span>
                </th>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </DataTableBody>
          </DataTable>
        </div>

        <div className="grid gap-3 lg:hidden">
          {users.map((user) => (
            <UserMobileCard key={user.id} user={user} />
          ))}
        </div>

        {users.length === 0 ? (
          <EmptyState
            title="No users match these filters."
            description="Clear filters or adjust the access criteria to review more users."
            action={<ButtonLink href="/platform/users" variant="primary">Clear filters</ButtonLink>}
          />
        ) : null}
      </section>
    </DashboardShell>
  );
}

function UserRow({ user }: { user: UserWithListData }) {
  const displayName = getDisplayUserName(user);

  return (
    <tr className="group align-middle">
      <td className="min-w-0 py-3 pl-4 pr-3 align-middle">
        <span className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/platform/users/${user.id}`}
            className="font-semibold text-[#171A21] transition hover:text-[var(--accent-deep)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 group-hover:text-[var(--accent-deep)]"
            aria-label={`Open ${displayName} user details`}
          >
            {displayName}
          </Link>
          {isSuspiciousUser(user) ? <SuspiciousBadge /> : null}
        </span>
        <p className="mt-0.5 break-all text-xs text-[#7A8091]">{user.email}</p>
      </td>
      <DataTableCell>
        <RoleBadge role={user.role} />
      </DataTableCell>
      <DataTableCell className="text-[#3D4352]">
        <span className="line-clamp-2 leading-5" title={user.business?.name ?? undefined}>{user.business?.name ?? "—"}</span>
      </DataTableCell>
      <DataTableCell className="text-[#3D4352]">
        <span className="line-clamp-2 leading-5" title={user.branch?.name ?? undefined}>{user.branch?.name ?? "—"}</span>
      </DataTableCell>
      <DataTableCell>
        <StatusBadge status={user.status} />
      </DataTableCell>
      <DataTableCell className="whitespace-nowrap text-[#7A8091]">{formatDate(user.createdAt)}</DataTableCell>
      <DataTableCell className="w-8 pr-4 text-[#9AA0AD]">
        <ChevronRight className="h-4 w-4 transition group-hover:text-[var(--accent-deep)]" aria-hidden="true" />
      </DataTableCell>
    </tr>
  );
}

function UserMobileCard({ user }: { user: UserWithListData }) {
  const displayName = getDisplayUserName(user);

  return (
    <Link
      href={`/platform/users/${user.id}`}
      className="group block rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition hover:border-[var(--light-orange)] hover:shadow-[0_6px_18px_rgba(15,18,25,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      aria-label={`Open ${displayName} user details`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex min-w-0 items-center gap-1 break-words font-semibold text-[#171A21] transition group-hover:text-[var(--accent-deep)]">
            {displayName}
            <ChevronRight className="h-4 w-4 shrink-0 text-[#7A8091] transition group-hover:text-[var(--accent-deep)]" aria-hidden="true" />
          </h3>
          <p className="mt-1 break-all text-xs text-[#7A8091]">{user.email}</p>
        </div>
        <StatusBadge status={user.status} />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <RoleBadge role={user.role} />
        {isSuspiciousUser(user) ? <SuspiciousBadge /> : null}
      </div>

      <dl className="mt-3 grid gap-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Business</dt>
          <dd className="text-right font-semibold text-[#171A21]">{user.business?.name ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Branch</dt>
          <dd className="text-right font-semibold text-[#171A21]">{user.branch?.name ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[#7A8091]">Created</dt>
          <dd className="text-right font-semibold text-[#171A21]">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>
    </Link>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-medium text-[#171A21]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
      >
        {children}
      </select>
    </label>
  );
}

function InputField({
  label,
  name,
  type,
  defaultValue,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
}) {
  return (
    <label className="text-sm font-medium text-[#171A21]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1 h-11 w-full rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#171A21] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] sm:h-10"
      />
    </label>
  );
}

function QuickChip({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
        active
          ? "border-[var(--light-orange)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
          : "border-[var(--medium-gray)] bg-white text-[#7A8091] hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)]"
      }`}
    >
      {label}
    </Link>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const tone =
    role === "PLATFORM_OWNER"
      ? "border-[var(--light-orange)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
      : role === "BUSINESS_OWNER"
        ? "border-[#C0DD97] bg-[#EAF3DE] text-[#3B6D11]"
        : role === "BRANCH_MANAGER"
          ? "border-[#CECBF6] bg-[#EEEDFE] text-[#534AB7]"
          : "border-[#B5D4F4] bg-[#E6F1FB] text-[#185FA5]";

  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{roleLabels[role]}</span>;
}

function SuspiciousBadge() {
  return (
    <span className="inline-flex w-fit items-center whitespace-nowrap rounded-full border border-[#F3D9A4] bg-[#FCF0DC] px-2 py-0.5 text-[11px] font-semibold text-[#B25E09]">
      Review flagged
    </span>
  );
}
