import type { BusinessType, Prisma, RecordStatus } from "@prisma/client";
import { Eye, MoreHorizontal, Pencil, Plus, Power, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { toggleBusinessStatusAction } from "@/app/platform/businesses/actions";

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
const validStatuses: RecordStatus[] = ["ACTIVE", "INACTIVE"];
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
    ...(selectedStatus ? { status: selectedStatus } : {}),
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

  return (
    <DashboardShell user={user} eyebrow="System Administrator" title="Businesses">
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Tenant overview</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Search, filter, and manage business tenants.</p>
          </div>
          <Link
            href="/platform/businesses/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Create Business
          </Link>
        </div>

        <div className="mt-5 hidden grid-cols-4 gap-3 lg:grid">
          <BusinessSummaryCard label="Total businesses" value={businessSummary.total} href="/platform/businesses" />
          <BusinessSummaryCard label="Active" value={businessSummary.active} href="/platform/businesses?status=ACTIVE" />
          <BusinessSummaryCard label="Inactive" value={businessSummary.inactive} href="/platform/businesses?status=INACTIVE" />
          <BusinessSummaryCard label="Demo/Test flagged" value={businessSummary.flagged} href="/platform/businesses?suspect=1" />
        </div>

        <MobileFilterDrawer activeCount={activeFilterCount}>
        <form className="mt-6 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4 md:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <SlidersHorizontal className="h-4 w-4 text-[#F97316]" />
            Filters
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-[#111827]">
              Search
              <div className="mt-1 flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3">
                <Search className="h-4 w-4 text-[#6B7280]" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Business name"
                  className="h-10 w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>

            <SelectField label="Business type" name="type" defaultValue={selectedType}>
              <option value="">All types</option>
              {validBusinessTypes.map((type) => (
                <option key={type} value={type}>
                  {businessTypeLabels[type]}
                </option>
              ))}
            </SelectField>

            <SelectField label="Status" name="status" defaultValue={selectedStatus}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
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
          </div>

          {suspectOnly ? <input type="hidden" name="suspect" value="1" /> : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <QuickChip href="/platform/businesses" label="All" active={!selectedStatus && !selectedPlanId && !suspectOnly} />
              <QuickChip href={buildQuickFilterHref({ status: "ACTIVE" })} label="Active" active={selectedStatus === "ACTIVE"} />
              <QuickChip href={buildQuickFilterHref({ status: "INACTIVE" })} label="Inactive" active={selectedStatus === "INACTIVE"} />
              {growthPlan ? (
                <QuickChip href={buildQuickFilterHref({ plan: growthPlan.id.toString() })} label="Growth Plan" active={selectedPlanId === growthPlan.id} />
              ) : null}
              {starterPlan ? (
                <QuickChip href={buildQuickFilterHref({ plan: starterPlan.id.toString() })} label="Starter Plan" active={selectedPlanId === starterPlan.id} />
              ) : null}
              <QuickChip href={buildQuickFilterHref({ suspect: "1" })} label="Demo/Test Data" active={suspectOnly} />
            </div>

            <div className="flex gap-2">
              <Link
                href="/platform/businesses"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
              >
                <X className="h-4 w-4" />
                Clear filters
              </Link>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#374151]"
              >
                Apply filters
              </button>
            </div>
          </div>
        </form>
        <form className="mt-6 hidden rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4 md:block">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <SlidersHorizontal className="h-4 w-4 text-[#F97316]" />
            Filters
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_180px_minmax(220px,260px)_auto_auto] lg:items-end">
            <label className="text-sm font-medium text-[#111827]">
              Search
              <div className="mt-1 flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3">
                <Search className="h-4 w-4 text-[#6B7280]" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Business name"
                  className="h-10 w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>

            <SelectField label="Status" name="status" defaultValue={selectedStatus}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
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
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#374151]"
            >
              Apply
            </button>
            <Link
              href="/platform/businesses"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
            >
              <X className="h-4 w-4" />
              Clear
            </Link>
          </div>

          <details className="mt-4 rounded-md border border-[#E5E7EB] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#111827]">
              <span>Advanced filters</span>
              <span className="text-xs font-medium text-[#6B7280]">Type, dates, branches, sorting, demo/test</span>
            </summary>
            <div className="border-t border-[#E5E7EB] p-4">
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

                <label className="flex h-full min-h-10 items-end gap-2 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-semibold text-[#111827]">
                  <input type="checkbox" name="suspect" value="1" defaultChecked={suspectOnly} className="h-4 w-4 rounded border-[#D1D5DB]" />
                  Demo/Test filter
                </label>
              </div>
            </div>
          </details>

          <div className="mt-4 flex flex-wrap gap-2">
            <QuickChip href="/platform/businesses" label="All" active={!selectedStatus && !selectedPlanId && !suspectOnly} />
            <QuickChip href={buildQuickFilterHref({ status: "ACTIVE" })} label="Active" active={selectedStatus === "ACTIVE"} />
            <QuickChip href={buildQuickFilterHref({ status: "INACTIVE" })} label="Inactive" active={selectedStatus === "INACTIVE"} />
            {growthPlan ? (
              <QuickChip href={buildQuickFilterHref({ plan: growthPlan.id.toString() })} label="Growth Plan" active={selectedPlanId === growthPlan.id} />
            ) : null}
            {starterPlan ? (
              <QuickChip href={buildQuickFilterHref({ plan: starterPlan.id.toString() })} label="Starter Plan" active={selectedPlanId === starterPlan.id} />
            ) : null}
            <QuickChip href={buildQuickFilterHref({ suspect: "1" })} label="Demo/Test Data" active={suspectOnly} />
          </div>
        </form>
        </MobileFilterDrawer>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#111827]">Showing {businesses.length} businesses</p>
          <p className="text-xs text-[#6B7280]">Test/demo badges are visual only. No records are hidden or changed.</p>
        </div>

        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Business name", "Business type", "Status", "Branch count", "Plan", "Created date", "Actions"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => (
                <BusinessRow key={business.id} business={business} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 lg:hidden">
          {businesses.map((business) => (
            <BusinessMobileCard key={business.id} business={business} />
          ))}
        </div>

        {businesses.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#E5E7EB] py-8 text-center text-sm text-[#6B7280]">
            No businesses match the current filters.
          </p>
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
  min,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  min?: string;
}) {
  return (
    <label className="text-sm font-medium text-[#111827]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        min={min}
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

function BusinessSummaryCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className={`h-full rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4 transition ${href ? "cursor-pointer hover:border-[#F97316] hover:bg-white hover:shadow-md" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#111827]">{value}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-md focus:outline-none focus:ring-4 focus:ring-orange-100">
      {content}
    </Link>
  ) : (
    content
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
  const nextStatus = business.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const planName = business.subscriptions[0]?.subscriptionPlan.name ?? "Unassigned";

  return (
    <tr className="align-top">
      <td className="border-b border-[#E5E7EB] px-3 py-3">
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-[#111827]">{business.name}</span>
          {isSuspiciousBusinessName(business.name) ? <SuspiciousBadge /> : null}
        </div>
      </td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{businessTypeLabels[business.businessType]}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3">
        <StatusBadge status={business.status} />
      </td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-center font-semibold text-[#111827]">{business._count.branches}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{planName}</td>
      <td className="whitespace-nowrap border-b border-[#E5E7EB] px-3 py-3 text-[#6B7280]">{formatDate(business.createdAt)}</td>
      <td className="border-b border-[#E5E7EB] px-3 py-3">
        <BusinessActions business={business} nextStatus={nextStatus} variant="table" />
      </td>
    </tr>
  );
}

function BusinessMobileCard({ business }: { business: BusinessWithListData }) {
  const nextStatus = business.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const planName = business.subscriptions[0]?.subscriptionPlan.name ?? "Unassigned";

  return (
    <article className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#111827]">{business.name}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{businessTypeLabels[business.businessType]}</p>
        </div>
        <StatusBadge status={business.status} />
      </div>
      {isSuspiciousBusinessName(business.name) ? (
        <div className="mt-3">
          <SuspiciousBadge />
        </div>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Branches" value={business._count.branches.toString()} />
        <Detail label="Plan" value={planName} />
        <Detail label="Created" value={formatDate(business.createdAt)} />
        <Detail label="Status" value={business.status === "ACTIVE" ? "Active" : "Inactive"} />
      </dl>
      <div className="mt-4">
        <BusinessActions business={business} nextStatus={nextStatus} variant="mobile" />
      </div>
    </article>
  );
}

function BusinessActions({
  business,
  nextStatus,
  variant = "mobile",
}: {
  business: BusinessWithListData;
  nextStatus: RecordStatus;
  variant?: "table" | "mobile";
}) {
  const toggleLabel = nextStatus === "ACTIVE" ? "Enable" : "Disable";
  const toggleMessage =
    nextStatus === "ACTIVE"
      ? "Enable this business and restore access?"
      : "Disable this business? Owners, staff, scanners, and customer activity may be blocked.";

  if (variant === "table") {
    return (
      <div className="flex items-center gap-2">
        <Link
          className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
          href={`/platform/businesses/${business.uuid}`}
        >
          <Eye className="h-4 w-4" />
          View
        </Link>
        <details className="relative">
          <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-1 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]">
            <MoreHorizontal className="h-4 w-4" />
            More
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-44 rounded-md border border-[#E5E7EB] bg-white p-2 shadow-lg">
            <Link
              className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[#111827] transition hover:bg-orange-50 hover:text-[#F97316]"
              href={`/platform/businesses/${business.uuid}/edit`}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={toggleBusinessStatusAction} className="mt-1">
              <CsrfInput scope="platform:businesses" />
              <input type="hidden" name="businessId" value={business.id} />
              <input type="hidden" name="businessUuid" value={business.uuid} />
              <input type="hidden" name="nextStatus" value={nextStatus} />
              <ConfirmSubmitButton
                message={toggleMessage}
                className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-semibold text-[#111827] transition hover:bg-orange-50 hover:text-[#F97316]"
              >
                <Power className="h-4 w-4" />
                {toggleLabel}
              </ConfirmSubmitButton>
            </form>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
        href={`/platform/businesses/${business.uuid}`}
      >
        <Eye className="h-4 w-4" />
        View
      </Link>
      <Link
        className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
        href={`/platform/businesses/${business.uuid}/edit`}
      >
        <Pencil className="h-4 w-4" />
        Edit
      </Link>
      <form action={toggleBusinessStatusAction}>
        <CsrfInput scope="platform:businesses" />
        <input type="hidden" name="businessId" value={business.id} />
        <input type="hidden" name="businessUuid" value={business.uuid} />
        <input type="hidden" name="nextStatus" value={nextStatus} />
        <ConfirmSubmitButton
          message={toggleMessage}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
        >
          <Power className="h-4 w-4" />
          {toggleLabel}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</dt>
      <dd className="mt-1 font-semibold text-[#111827]">{value}</dd>
    </div>
  );
}

function SuspiciousBadge() {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-[#C2410C]">
      Test/Demo Data
    </span>
  );
}

