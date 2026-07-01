import type { Prisma, RecordStatus, UserRole } from "@prisma/client";
import { ChevronRight, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { ButtonLink, EmptyState } from "@/components/ui";
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
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Users created by the platform</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Search, filter, and review user access across businesses and branches.</p>
          </div>
        </div>

        <MobileFilterDrawer activeCount={activeFilterCount}>
        <form className="mt-5 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <SlidersHorizontal className="h-4 w-4 text-[#F97316]" />
            Filters
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-[#111827]">
              Search name
              <div className="mt-1 flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3">
                <Search className="h-4 w-4 text-[#6B7280]" />
                <input name="name" defaultValue={name} placeholder="Full name" className="h-10 w-full bg-transparent text-sm outline-none" />
              </div>
            </label>

            <label className="text-sm font-medium text-[#111827]">
              Search email
              <div className="mt-1 flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3">
                <Search className="h-4 w-4 text-[#6B7280]" />
                <input name="email" defaultValue={email} placeholder="Email address" className="h-10 w-full bg-transparent text-sm outline-none" />
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

          {suspectOnly ? <input type="hidden" name="suspect" value="1" /> : null}

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
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

            <div className="flex gap-2">
              <Link
                href="/platform/users"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
              >
                <RotateCcw className="h-4 w-4" />
                Clear filters
              </Link>
              <button type="submit" className="h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600">
                Apply filters
              </button>
            </div>
          </div>
        </form>
        </MobileFilterDrawer>

        <div className="mt-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#111827]">Showing {users.length} users</p>
          <p className="text-xs text-[#6B7280]">Archived users are hidden unless the Archived filter is selected.</p>
        </div>

        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Name", "Role", "Business", "Branch", "Status", "Created date", ""].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 lg:hidden">
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
  const href = `/platform/users/${user.id}`;

  return (
    <tr className="group align-top transition hover:bg-[#F8FAFC] focus-within:bg-[#F8FAFC]">
      <td className="border-b border-[#E5E7EB] p-0">
        <Link href={href} className="block px-3 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-inset" aria-label={`Open ${displayName} user details`}>
          <div className="flex flex-col gap-2">
          <span className="font-semibold text-[#111827]">{displayName}</span>
          {isSuspiciousUser(user) ? <SuspiciousBadge /> : null}
          </div>
        </Link>
      </td>
      <td className="border-b border-[#E5E7EB] p-0">
        <Link href={href} className="block px-3 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-inset">
          <RoleBadge role={user.role} />
        </Link>
      </td>
      <td className="max-w-[340px] border-b border-[#E5E7EB] p-0 text-[#6B7280]" title={user.business?.name ?? "-"}>
        <Link href={href} className="block px-3 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-inset">
          <span className="line-clamp-2 leading-5">{user.business?.name ?? "-"}</span>
        </Link>
      </td>
      <td className="max-w-[300px] border-b border-[#E5E7EB] p-0 text-[#6B7280]" title={user.branch?.name ?? "-"}>
        <Link href={href} className="block px-3 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-inset">
          <span className="line-clamp-2 leading-5">{user.branch?.name ?? "-"}</span>
        </Link>
      </td>
      <td className="border-b border-[#E5E7EB] p-0">
        <Link href={href} className="block px-3 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-inset">
          <StatusBadge status={user.status} />
        </Link>
      </td>
      <td className="border-b border-[#E5E7EB] p-0 text-[#6B7280]">
        <Link href={href} className="block px-3 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-inset">
          {formatDate(user.createdAt)}
        </Link>
      </td>
      <td className="border-b border-[#E5E7EB] p-0">
        <Link href={href} className="flex px-3 py-4 text-[#94A3B8] transition group-hover:text-[#F97316] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-inset" aria-label={`Open ${displayName}`}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}

function UserMobileCard({ user }: { user: UserWithListData }) {
  const displayName = getDisplayUserName(user);

  return (
    <Link href={`/platform/users/${user.id}`} className="block rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:border-[#F97316] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#111827]">{displayName}</h3>
          <p className="mt-1 break-all font-mono text-xs text-[#374151]">{user.email}</p>
        </div>
        <StatusBadge status={user.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <RoleBadge role={user.role} />
        {isSuspiciousUser(user) ? <SuspiciousBadge /> : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Business" value={user.business?.name ?? "-"} />
        <Detail label="Branch" value={user.branch?.name ?? "-"} />
        <Detail label="Created" value={formatDate(user.createdAt)} />
        <div className="col-span-2 flex items-center justify-between rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-sm font-semibold text-[#111827]">
          View user details
          <ChevronRight className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
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
    <label className="text-sm font-medium text-[#111827]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#F97316]"
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
    <label className="text-sm font-medium text-[#111827]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#F97316]"
      />
    </label>
  );
}

function QuickChip({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition ${
        active
          ? "border-[#F97316] bg-orange-50 text-[#F97316]"
          : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#F97316] hover:text-[#F97316]"
      }`}
    >
      {label}
    </Link>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const tone =
    role === "PLATFORM_OWNER"
      ? "border-purple-200 bg-purple-50 text-purple-700"
      : role === "BUSINESS_OWNER"
        ? "border-orange-200 bg-orange-50 text-[#C2410C]"
        : role === "BRANCH_MANAGER"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]";

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${tone}`}>{roleLabels[role]}</span>;
}

function SuspiciousBadge() {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-[#C2410C]">
      Review flagged
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <dt className="text-xs font-semibold uppercase text-[#6B7280]">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-[#111827]">{value}</dd>
    </div>
  );
}

