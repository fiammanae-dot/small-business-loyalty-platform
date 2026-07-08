import type { BusinessType, Prisma, RecordStatus } from "@prisma/client";
import { ChevronRight, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, DataTableBody, DataTableCell, DataTableHeadCell, DataTableHeader, EmptyState, MetricCard, SortableHeadCell } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";

type BusinessesSearchParams = {
  q?: string;
  type?: string;
  status?: string;
  plan?: string;
  createdFrom?: string;
  createdTo?: string;
  minBranches?: string;
  maxBranches?: string;
  sort?: string;
  direction?: string;
  suspect?: string;
};

const sortableFields = {
  name: "Business name",
  createdAt: "Created date",
  branches: "Branch count",
  plan: "Plan",
  status: "Status",
} as const;

const validBusinessTypes = Object.keys(businessTypeLabels) as BusinessType[];
const validStatuses: RecordStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];
const suspiciousBusinessNamePattern = /(demo|test|phase|debug|updated|\d{10,})/i;

function getParam(params: BusinessesSearchParams, key: keyof BusinessesSearchParams) {
  return typeof params[key] === "string" ? params[key]?.trim() ?? "" : "";
}

function parseDate(value: string, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumber(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function buildQuickFilterHref(overrides: BusinessesSearchParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(overrides)) {
    if (value) {
      params.set(key, value);
    }
  }

  return `/platform/businesses${params.toString() ? `?${params.toString()}` : ""}`;
}

function buildSortHref(params: BusinessesSearchParams, field: keyof typeof sortableFields, currentSort: string, currentDirection: string) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      query.set(key, value);
    }
  }

  const nextDirection =
    currentSort === field ? (currentDirection === "asc" ? "desc" : "asc") : field === "createdAt" || field === "branches" ? "desc" : "asc";
  query.set("sort", field);
  query.set("direction", nextDirection);

  return `/platform/businesses?${query.toString()}`;
}

function isSuspiciousBusinessName(name: string) {
  return suspiciousBusinessNamePattern.test(name);
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<BusinessesSearchParams>;
}) {
  const user = await requireRole("PLATFORM_OWNER");
  const params = await searchParams;

  const query = getParam(params, "q");
  const selectedType = validBusinessTypes.includes(params.type as BusinessType) ? (params.type as BusinessType) : "";
  const selectedStatus = validStatuses.includes(params.status as RecordStatus) ? (params.status as RecordStatus) : "";
  const selectedPlanId = parseNumber(getParam(params, "plan"));
  const createdFrom = parseDate(getParam(params, "createdFrom"));
  const createdTo = parseDate(getParam(params, "createdTo"), true);
  const minBranches = parseNumber(getParam(params, "minBranches"));
  const maxBranches = parseNumber(getParam(params, "maxBranches"));
  const sort = Object.keys(sortableFields).includes(params.sort ?? "") ? (params.sort as keyof typeof sortableFields) : "createdAt";
  const direction = params.direction === "asc" ? "asc" : "desc";
  const suspectOnly = params.suspect === "1";

  const createdAt: Prisma.DateTimeFilter = {};
  if (createdFrom) {
    createdAt.gte = createdFrom;
  }
  if (createdTo) {
    createdAt.lte = createdTo;
  }

  const where: Prisma.BusinessWhereInput = {
    ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    ...(selectedType ? { businessType: selectedType } : {}),
    // Archived businesses are hidden from every normal view unless explicitly requested
    // via ?status=ARCHIVED - this is a soft-delete list, not a status like any other.
    ...(selectedStatus ? { status: selectedStatus } : { status: { not: "ARCHIVED" } }),
    ...(createdFrom || createdTo ? { createdAt } : {}),
    ...(selectedPlanId
      ? {
          subscriptions: {
            some: {
              subscriptionPlanId: selectedPlanId,
              status: { in: ["TRIAL", "ACTIVE"] },
            },
          },
        }
      : {}),
  };

  const [plans, allBusinesses] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { maxBranches: "asc" }, select: { id: true, name: true } }),
    prisma.business.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { branches: true } },
        subscriptions: {
          where: { status: { in: ["TRIAL", "ACTIVE"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { subscriptionPlan: true },
        },
      },
    }),
  ]);

  const businesses = allBusinesses
    .filter((business) => (minBranches === null ? true : business._count.branches >= minBranches))
    .filter((business) => (maxBranches === null ? true : business._count.branches <= maxBranches))
    .filter((business) => (suspectOnly ? isSuspiciousBusinessName(business.name) : true))
    .sort((a, b) => {
      const multiplier = direction === "asc" ? 1 : -1;

      if (sort === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      }
      if (sort === "branches") {
        return (a._count.branches - b._count.branches) * multiplier;
      }
      if (sort === "plan") {
        return ((a.subscriptions[0]?.subscriptionPlan.name ?? "Unassigned").localeCompare(
          b.subscriptions[0]?.subscriptionPlan.name ?? "Unassigned",
        )) * multiplier;
      }
      if (sort === "status") {
        return a.status.localeCompare(b.status) * multiplier;
      }

      return (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier;
    });

  const growthPlan = plans.find((plan) => plan.name.toLowerCase() === "growth");
  const starterPlan = plans.find((plan) => plan.name.toLowerCase() === "starter");
  const hasAdvancedFilters = Boolean(
    selectedType ||
      getParam(params, "createdFrom") ||
      getParam(params, "createdTo") ||
      getParam(params, "minBranches") ||
      getParam(params, "maxBranches") ||
      suspectOnly,
  );
  const activeFilterCount = [
    query,
    selectedType,
    selectedStatus,
    selectedPlanId,
    getParam(params, "createdFrom"),
    getParam(params, "createdTo"),
    getParam(params, "minBranches"),
    getParam(params, "maxBranches"),
    suspectOnly ? "1" : "",
  ].filter(Boolean).length;
  const businessSummary = {
    total: businesses.length,
    active: businesses.filter((business) => business.status === "ACTIVE").length,
    inactive: businesses.filter((business) => business.status === "INACTIVE").length,
    flagged: businesses.filter((business) => isSuspiciousBusinessName(business.name)).length,
  };

  const quickChips = (
    <div className="flex flex-wrap gap-2">
      <QuickChip href="/platform/businesses" label="All" active={!selectedStatus && !selectedPlanId && !suspectOnly} />
      <QuickChip href={buildQuickFilterHref({ status: "ACTIVE" })} label="Active" active={selectedStatus === "ACTIVE"} />
      <QuickChip href={buildQuickFilterHref({ status: "INACTIVE" })} label="Inactive" active={selectedStatus === "INACTIVE"} />
      <QuickChip href={buildQuickFilterHref({ status: "ARCHIVED" })} label="Archived" active={selectedStatus === "ARCHIVED"} />
      {growthPlan ? (
        <QuickChip href={buildQuickFilterHref({ plan: growthPlan.id.toString() })} label="Growth Plan" active={selectedPlanId === growthPlan.id} />
      ) : null}
      {starterPlan ? (
        <QuickChip href={buildQuickFilterHref({ plan: starterPlan.id.toString() })} label="Starter Plan" active={selectedPlanId === starterPlan.id} />
      ) : null}
      <QuickChip href={buildQuickFilterHref({ suspect: "1" })} label="Review flagged" active={suspectOnly} />
    </div>
  );

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Businesses">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#7A8091]">Search, filter, and manage business tenants.</p>
        <Link
          href="/platform/businesses/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(232,106,51,0.25)] transition hover:bg-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Business
        </Link>
      </section>

      <section aria-label="Business summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total businesses" value={businessSummary.total} href="/platform/businesses" />
        <MetricCard label="Active" value={businessSummary.active} href="/platform/businesses?status=ACTIVE" tone="success" />
        <MetricCard label="Inactive" value={businessSummary.inactive} href="/platform/businesses?status=INACTIVE" tone={businessSummary.inactive > 0 ? "warning" : "neutral"} />
        <MetricCard label="Review flagged" value={businessSummary.flagged} href="/platform/businesses?suspect=1" tone={businessSummary.flagged > 0 ? "warning" : "neutral"} />
      </section>

      <MobileFilterDrawer activeCount={activeFilterCount}>
        <form className="rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#171A21]">
            <SlidersHorizontal className="h-4 w-4 text-[var(--accent-deep)]" aria-hidden="true" />
            Filters
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(240px,1.6fr)_minmax(150px,1fr)_minmax(200px,1fr)_auto_auto] lg:items-end">
            <label className="text-sm font-medium text-[#171A21]">
              Search
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-3 transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-soft)]">
                <Search className="h-4 w-4 text-[#7A8091]" aria-hidden="true" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Business name"
                  className="h-11 w-full bg-transparent text-sm outline-none sm:h-10"
                />
              </div>
            </label>

            <SelectField label="Status" name="status" defaultValue={selectedStatus}>
              <option value="">All statuses (excludes archived)</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </SelectField>

            <SearchableCombobox
              label="Plan"
              name="plan"
              defaultValue={selectedPlanId?.toString() ?? ""}
              placeholder="All plans"
              emptyLabel="No plans found."
              options={[
                { value: "", label: "All plans", description: "Show every subscription plan" },
                ...plans.map((plan) => ({ value: plan.id.toString(), label: plan.name, description: "Subscription plan" })),
              ]}
            />

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#171A21] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4352] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              Apply
            </button>
            <Link
              href="/platform/businesses"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          </div>

          <details className="mt-4 rounded-lg border border-[var(--medium-gray)] bg-white" open={hasAdvancedFilters}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-[#171A21] transition hover:bg-[var(--light-gray)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <span>Advanced filters</span>
              <span className="text-xs font-medium text-[#7A8091]">Type, dates, branches, sorting, review flags</span>
            </summary>
            <div className="border-t border-[var(--medium-gray)] p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SelectField label="Business type" name="type" defaultValue={selectedType}>
                  <option value="">All types</option>
                  {validBusinessTypes.map((type) => (
                    <option key={type} value={type}>
                      {businessTypeLabels[type]}
                    </option>
                  ))}
                </SelectField>

                <InputField label="Created from" name="createdFrom" type="date" defaultValue={getParam(params, "createdFrom")} />
                <InputField label="Created to" name="createdTo" type="date" defaultValue={getParam(params, "createdTo")} />
                <InputField label="Min branches" name="minBranches" type="number" min="0" defaultValue={getParam(params, "minBranches")} />
                <InputField label="Max branches" name="maxBranches" type="number" min="0" defaultValue={getParam(params, "maxBranches")} />

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

                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-[var(--light-gray)] px-3 py-2 text-sm font-semibold text-[#171A21]">
                  <input
                    type="checkbox"
                    name="suspect"
                    value="1"
                    defaultChecked={suspectOnly}
                    className="h-4 w-4 rounded border-[#D8DBE2] accent-[var(--accent)]"
                  />
                  Review flag filter
                </label>
              </div>
            </div>
          </details>

          <div className="mt-4">{quickChips}</div>
        </form>
      </MobileFilterDrawer>

      <section aria-label="Business results" className="grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#171A21]">Showing {businesses.length} businesses</p>
          <p className="text-xs text-[#7A8091]">Review flags are visual only. No records are hidden or changed.</p>
        </div>

        <div className="hidden lg:block">
          <DataTable className="min-w-[860px]">
            <DataTableHeader>
              <tr>
                <SortableHeadCell href={buildSortHref(params, "name", sort, direction)} active={sort === "name"} direction={direction} className="pl-4">Business name</SortableHeadCell>
                <DataTableHeadCell>Business type</DataTableHeadCell>
                <SortableHeadCell href={buildSortHref(params, "status", sort, direction)} active={sort === "status"} direction={direction}>Status</SortableHeadCell>
                <SortableHeadCell href={buildSortHref(params, "branches", sort, direction)} active={sort === "branches"} direction={direction} align="right">Branches</SortableHeadCell>
                <SortableHeadCell href={buildSortHref(params, "plan", sort, direction)} active={sort === "plan"} direction={direction}>Plan</SortableHeadCell>
                <SortableHeadCell href={buildSortHref(params, "createdAt", sort, direction)} active={sort === "createdAt"} direction={direction} className="pr-4">Created</SortableHeadCell>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {businesses.map((business) => (
                <BusinessRow key={business.id} business={business} />
              ))}
            </DataTableBody>
          </DataTable>
        </div>

        <div className="grid gap-3 lg:hidden">
          {businesses.map((business) => (
            <BusinessMobileCard key={business.id} business={business} />
          ))}
        </div>

        {businesses.length === 0 ? (
          <EmptyState
            title="No businesses match the current filters."
            description="Clear filters or adjust the tenant search criteria to review more businesses."
            action={
              <Link
                href="/platform/businesses"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 text-sm font-semibold text-[#171A21] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </Link>
            }
          />
        ) : null}
      </section>
    </DashboardShell>
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
  min,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  min?: string;
}) {
  return (
    <label className="text-sm font-medium text-[#171A21]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        min={min}
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
      className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
        active
          ? "border-[var(--light-orange)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
          : "border-[var(--medium-gray)] bg-white text-[#7A8091] hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)]"
      }`}
    >
      {label}
    </Link>
  );
}

type BusinessWithListData = Prisma.BusinessGetPayload<{
  include: {
    _count: { select: { branches: true } };
    subscriptions: {
      include: { subscriptionPlan: true };
    };
  };
}>;

function BusinessRow({ business }: { business: BusinessWithListData }) {
  const planName = business.subscriptions[0]?.subscriptionPlan.name ?? "Unassigned";

  return (
    <tr className="group align-middle">
      <td className="min-w-0 py-3 pl-4 pr-3 align-middle">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/platform/businesses/${business.uuid}`}
            className="inline-flex w-fit items-center gap-1 font-semibold text-[#171A21] transition hover:text-[var(--accent-deep)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 group-hover:text-[var(--accent-deep)]"
          >
            {business.name}
            <ChevronRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
          </Link>
          {isSuspiciousBusinessName(business.name) ? <SuspiciousBadge /> : null}
        </div>
      </td>
      <DataTableCell className="text-[#7A8091]">{businessTypeLabels[business.businessType]}</DataTableCell>
      <DataTableCell>
        <StatusBadge status={business.status} />
      </DataTableCell>
      <DataTableCell className="text-right font-semibold tabular-nums text-[#171A21]">{business._count.branches}</DataTableCell>
      <DataTableCell>{planName}</DataTableCell>
      <DataTableCell className="whitespace-nowrap pr-4 text-[#7A8091]">{formatDate(business.createdAt)}</DataTableCell>
    </tr>
  );
}

function BusinessMobileCard({ business }: { business: BusinessWithListData }) {
  const planName = business.subscriptions[0]?.subscriptionPlan.name ?? "Unassigned";
  const branchLabel = `${business._count.branches} ${business._count.branches === 1 ? "branch" : "branches"}`;

  return (
    <Link
      href={`/platform/businesses/${business.uuid}`}
      className="group block rounded-xl border border-[var(--medium-gray)] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition hover:border-[var(--light-orange)] hover:shadow-[0_6px_18px_rgba(15,18,25,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      aria-label={`Open ${business.name} business details`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-1 break-words font-semibold text-[#171A21] transition group-hover:text-[var(--accent-deep)]">
          {business.name}
          <ChevronRight className="h-4 w-4 shrink-0 text-[#7A8091] transition group-hover:text-[var(--accent-deep)]" aria-hidden="true" />
        </h3>
        <StatusBadge status={business.status} />
      </div>
      <p className="mt-1.5 text-sm text-[#7A8091]">
        {businessTypeLabels[business.businessType]} · {branchLabel} · {planName} · {formatDate(business.createdAt)}
      </p>
      {isSuspiciousBusinessName(business.name) ? (
        <div className="mt-2.5">
          <SuspiciousBadge />
        </div>
      ) : null}
    </Link>
  );
}

function SuspiciousBadge() {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-[#F3D9A4] bg-[#FCF0DC] px-2.5 py-1 text-xs font-semibold text-[#B25E09]">
      Review flagged
    </span>
  );
}
