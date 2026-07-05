import Link from "next/link";
import { ChevronDown, ChevronRight, Download, Gift, QrCode, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  ButtonLink,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  PageActions,
  PageIntro,
  ProgressBar,
  SearchBar,
  StatusBadge,
} from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { formatDate } from "@/lib/format";
import { formatUaePhoneDisplay, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

const tierOptions = ["BRONZE", "SILVER", "GOLD", "VIP"] as const;

type CustomerSearchParams = {
  q?: string;
  status?: string;
  consent?: string;
  source?: string;
  branch?: string;
  program?: string;
  tier?: string;
  reward?: string;
  error?: string;
  success?: string;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<CustomerSearchParams>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const params = await searchParams;
  const query = params.q?.trim();
  const normalizedQueryPhone = query ? normalizePhone(query) : null;
  const status = ["ACTIVE", "INACTIVE", "BLOCKED"].includes(params.status ?? "") ? params.status : undefined;
  const source = ["STAFF", "OWNER", "IMPORT", "SELF_SIGNUP"].includes(params.source ?? "") ? params.source : undefined;
  const consent = ["yes", "no"].includes(params.consent ?? "") ? params.consent : undefined;
  const tier = tierOptions.includes(params.tier as (typeof tierOptions)[number]) ? params.tier : undefined;
  const branchId = params.branch && !Number.isNaN(Number(params.branch)) ? Number(params.branch) : undefined;
  const rewardFilter = ["ready", "near"].includes(params.reward ?? "") ? params.reward : undefined;

  const [programs, customers, allCustomers] = await Promise.all([
    prisma.loyaltyProgram.findMany({
      where: { businessId: user.businessId, active: true },
      orderBy: { name: "asc" },
      select: { uuid: true, name: true },
    }),
    prisma.businessCustomerMembership.findMany({
      where: {
        businessId: user.businessId,
        ...(status ? { status: status as "ACTIVE" | "INACTIVE" | "BLOCKED" } : {}),
        ...(source ? { source: source as "STAFF" | "OWNER" | "IMPORT" | "SELF_SIGNUP" } : {}),
        ...(consent ? { marketingConsent: consent === "yes" } : {}),
        ...(tier ? { currentTier: tier as "BRONZE" | "SILVER" | "GOLD" | "VIP" } : {}),
        ...(branchId ? { createdBranchId: branchId } : {}),
        ...(params.program ? { programMemberships: { some: { loyaltyProgram: { uuid: params.program } } } } : {}),
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
                { normalizedPhone: { contains: query, mode: "insensitive" } },
                ...(normalizedQueryPhone ? [{ normalizedPhone: normalizedQueryPhone }] : []),
                { email: { contains: query, mode: "insensitive" } },
                { cardToken: { contains: query, mode: "insensitive" } },
                { referralCode: { contains: query, mode: "insensitive" } },
                { programMemberships: { some: { loyaltyProgram: { name: { contains: query, mode: "insensitive" } } } } },
              ],
            }
          : {}),
      },
      include: customerInclude,
      orderBy: { joinedAt: "desc" },
    }),
    prisma.businessCustomerMembership.findMany({
      where: { businessId: user.businessId },
      include: customerInclude,
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  const allRows = allCustomers.map(toCustomerSummary);
  const rowsWithUrls = customers.map((membership) => ({
    ...toCustomerSummary(membership),
    raw: membership,
    customerName: getCustomerName(membership),
  }));
  const customerRows = rowsWithUrls.filter((row) => {
    if (rewardFilter === "ready") return row.rewardReady;
    if (rewardFilter === "near") return row.nearReward;
    return true;
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = allRows.filter((row) => row.joinedAt >= monthStart).length;

  const segments: Array<{ key: string; label: string; count: number; href: string; tone?: "warning" }> = [
    { key: "all", label: "All customers", count: allRows.length, href: buildSegmentHref(query, {}) },
    { key: "reward", label: "Reward ready", count: allRows.filter((row) => row.rewardReady).length, href: buildSegmentHref(query, { reward: "ready" }), tone: "warning" },
    { key: "near", label: "Near reward", count: allRows.filter((row) => row.nearReward).length, href: buildSegmentHref(query, { reward: "near" }) },
    { key: "vip", label: "VIP", count: allRows.filter((row) => row.tier === "VIP").length, href: buildSegmentHref(query, { tier: "VIP" }) },
    { key: "active", label: "Active", count: allRows.filter((row) => row.status === "ACTIVE").length, href: buildSegmentHref(query, { status: "ACTIVE" }) },
    { key: "inactive", label: "Inactive", count: allRows.filter((row) => row.status === "INACTIVE").length, href: buildSegmentHref(query, { status: "INACTIVE" }) },
    { key: "noconsent", label: "No marketing consent", count: allRows.filter((row) => !row.marketingConsent).length, href: buildSegmentHref(query, { consent: "no" }) },
  ];
  const activeSegment = resolveSegment(params);
  const hasAdvancedFilters = Boolean(params.branch || params.program || params.source);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Customers" hideWelcomeMessage>
      <div className="space-y-5 pb-24 md:pb-0">
        <Message error={params.error} success={params.success} />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <PageIntro description="Manage your customers, loyalty progress, referrals and rewards." eyebrow="Customer Management Center" />
          <PageActions>
            <ButtonLink href="/dashboard/exports/customers" variant="outline" className="hidden sm:inline-flex">
              <Download className="h-4 w-4" aria-hidden />
              Export
            </ButtonLink>
            <ButtonLink href="/dashboard/scanner" variant="outline" className="hidden sm:inline-flex">
              <QrCode className="h-4 w-4" aria-hidden />
              Scanner
            </ButtonLink>
            <ButtonLink href="/dashboard/customers/new" variant="business">
              <UserPlus className="h-4 w-4" aria-hidden />
              Add Customer
            </ButtonLink>
          </PageActions>
        </div>

        <form action="/dashboard/customers" className="rounded-xl border border-[#E7E9EE] bg-white p-3 shadow-[0_1px_2px_rgba(15,18,25,0.04)] sm:p-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <SearchBar
              label="Search customers"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search by name, phone number, referral code or card number..."
              className="text-base"
            />
            <button
              type="submit"
              className="h-11 rounded-lg business-button px-6 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2"
            >
              Search
            </button>
          </div>

          <details className="mt-3 rounded-lg border border-[#E7E9EE]" open={hasAdvancedFilters}>
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3.5 py-2 text-sm font-semibold text-[#171A21] transition hover:bg-[#F3F4F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)]">
              <span>More filters</span>
              <span className="flex items-center gap-1 text-xs font-medium text-[#7A8091]">
                Branch, program, tier, status, reward state, consent
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </summary>
            <div className="grid gap-3 border-t border-[#E7E9EE] p-3.5 md:grid-cols-3 xl:grid-cols-6">
              <FilterSelect name="branch" label="All branches" value={params.branch} options={business.branches.map((branch: { id: number; name: string }) => [String(branch.id), branch.name] as [string, string])} />
              <FilterSelect name="program" label="All programs" value={params.program} options={programs.map((program) => [program.uuid, program.name] as [string, string])} />
              <FilterSelect name="tier" label="All tiers" value={params.tier} options={[["BRONZE", "Bronze"], ["SILVER", "Silver"], ["GOLD", "Gold"], ["VIP", "VIP"]]} />
              <FilterSelect name="status" label="All statuses" value={params.status} options={[["ACTIVE", "Active"], ["INACTIVE", "Inactive"], ["BLOCKED", "Blocked"]]} />
              <FilterSelect name="reward" label="All reward states" value={params.reward} options={[["ready", "Reward ready"], ["near", "Near reward"]]} />
              <FilterSelect name="consent" label="All consent" value={params.consent} options={[["yes", "Consented"], ["no", "No consent"]]} />
              <div className="flex gap-2 md:col-span-3 xl:col-span-6">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-lg border business-border px-4 text-sm font-semibold business-text transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2"
                >
                  Apply filters
                </button>
                <Link
                  href="/dashboard/customers"
                  className="inline-flex h-10 items-center rounded-lg border border-[#E7E9EE] px-4 text-sm font-semibold text-[#3D4352] transition hover:bg-[#F3F4F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2"
                >
                  Clear all
                </Link>
              </div>
            </div>
          </details>
        </form>

        <nav aria-label="Customer segments" className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {segments.map((segment) => (
            <Link
              key={segment.key}
              href={segment.href}
              aria-current={activeSegment === segment.key ? "true" : undefined}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2 ${
                activeSegment === segment.key
                  ? "business-border-soft business-bg-soft business-primary-strong"
                  : "border-[#E7E9EE] bg-white text-[#7A8091]"
              }`}
            >
              {segment.label}
              <span className="tabular-nums">{segment.count}</span>
            </Link>
          ))}
        </nav>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav
              aria-label="Customer segments"
              className="sticky top-6 rounded-xl border border-[#E7E9EE] bg-white p-2 shadow-[0_1px_2px_rgba(15,18,25,0.04)]"
            >
              <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#9AA0AD]">Segments</p>
              <div className="grid gap-0.5">
                {segments.map((segment) => {
                  const active = activeSegment === segment.key;
                  return (
                    <Link
                      key={segment.key}
                      href={segment.href}
                      aria-current={active ? "true" : undefined}
                      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--business-primary,#16A34A)] ${
                        active ? "business-bg-soft business-primary-strong" : "text-[#5A6070] hover:bg-[#F3F4F7] hover:text-[#171A21]"
                      }`}
                    >
                      <span className="min-w-0 truncate">{segment.label}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                          segment.tone === "warning" && segment.count > 0
                            ? "bg-[#FCF0DC] text-[#854F0B]"
                            : active
                              ? "bg-white/70 business-primary-strong"
                              : "bg-[#F3F4F7] text-[#7A8091]"
                        }`}
                      >
                        {segment.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>

          <section aria-label="Customer directory" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#171A21]">
                Showing {customerRows.length} customer{customerRows.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-[#7A8091]">{newThisMonth} joined this month</p>
            </div>

            {customerRows.length ? (
              <>
                <div className="hidden lg:block">
                  <DataTable className="table-fixed">
                    <DataTableHeader>
                      <tr>
                        <DataTableHeadCell className="w-[26%] pl-4">Customer</DataTableHeadCell>
                        <DataTableHeadCell className="w-[11%]">Tier</DataTableHeadCell>
                        <DataTableHeadCell className="w-[28%]">Progress</DataTableHeadCell>
                        <DataTableHeadCell className="w-[14%]">Last visit</DataTableHeadCell>
                        <DataTableHeadCell className="w-[13%]">Status</DataTableHeadCell>
                        <DataTableHeadCell className="w-8 pr-4">
                          <span className="sr-only">Open customer</span>
                        </DataTableHeadCell>
                      </tr>
                    </DataTableHeader>
                    <DataTableBody>
                      {customerRows.map((row) => (
                        <CustomerTableRow key={row.raw.id} row={row} />
                      ))}
                    </DataTableBody>
                  </DataTable>
                </div>
                <div className="grid gap-3 lg:hidden">
                  {customerRows.map((row) => (
                    <CustomerMobileCard key={row.raw.id} row={row} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                title="No customers found"
                description="Add a customer or clear filters to see every customer in your business."
                action={
                  <ButtonLink href="/dashboard/customers/new" variant="business">
                    Add Customer
                  </ButtonLink>
                }
              />
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

const customerInclude = {
  createdBranch: true,
  programMemberships: {
    where: { status: "ACTIVE" as const },
    include: {
      loyaltyProgram: { select: { name: true, requiredStamps: true } },
      stampTransactions: { orderBy: { createdAt: "desc" as const }, take: 1, select: { createdAt: true } },
    },
  },
};

function CustomerTableRow({ row }: { row: CustomerRow }) {
  const customerHref = `/dashboard/customers/${row.raw.uuid}`;

  return (
    <tr className={`group align-middle ${row.rewardReady ? "bg-[#FFFBF2]" : ""}`}>
      <td className="min-w-0 py-3 pl-4 pr-3 align-middle">
        <Link
          href={customerHref}
          aria-label={`Open ${row.customerName} Customer 360`}
          className="flex min-w-0 items-center gap-2.5 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2"
        >
          <CustomerAvatar name={row.customerName} tier={row.tier} rewardReady={row.rewardReady} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-[#171A21] transition group-hover:business-text">{row.customerName}</span>
            <span className="block truncate text-xs text-[#7A8091]">{formatUaePhoneDisplay(row.raw.normalizedPhone)}</span>
          </span>
        </Link>
      </td>
      <DataTableCell>
        <TierBadge tier={row.tier} />
      </DataTableCell>
      <DataTableCell>
        <CustomerProgress row={row} />
      </DataTableCell>
      <DataTableCell className="whitespace-nowrap text-[#7A8091]">{row.lastVisit ? formatDate(row.lastVisit) : "No visits"}</DataTableCell>
      <DataTableCell>
        <StatusBadge tone={row.status === "ACTIVE" ? "success" : row.status === "BLOCKED" ? "danger" : "neutral"} className="whitespace-nowrap">
          {row.status}
        </StatusBadge>
      </DataTableCell>
      <DataTableCell className="w-8 pr-4 text-[#9AA0AD]">
        <ChevronRight className="h-4 w-4 transition group-hover:business-text" aria-hidden />
      </DataTableCell>
    </tr>
  );
}

function CustomerMobileCard({ row }: { row: CustomerRow }) {
  return (
    <Link
      href={`/dashboard/customers/${row.raw.uuid}`}
      className={`block rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition hover:shadow-[0_6px_18px_rgba(15,18,25,0.08)] business-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2 ${
        row.rewardReady ? "border-[#F3D9A4]" : "border-[#E7E9EE]"
      }`}
      aria-label={`Open ${row.customerName} Customer 360`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CustomerAvatar name={row.customerName} tier={row.tier} rewardReady={row.rewardReady} />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate font-semibold text-[#171A21]">
              {row.customerName}
              <ChevronRight className="h-4 w-4 shrink-0 text-[#9AA0AD]" aria-hidden />
            </p>
            <p className="truncate text-xs text-[#7A8091]">{formatUaePhoneDisplay(row.raw.normalizedPhone)}</p>
          </div>
        </div>
        <StatusBadge tone={row.status === "ACTIVE" ? "success" : row.status === "BLOCKED" ? "danger" : "neutral"} className="shrink-0 whitespace-nowrap">
          {row.status}
        </StatusBadge>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <TierBadge tier={row.tier} />
        {row.rewardReady ? (
          <StatusBadge tone="warning" className="whitespace-nowrap">
            <Gift className="mr-1 h-3.5 w-3.5" aria-hidden />
            Reward Ready
          </StatusBadge>
        ) : null}
      </div>
      <div className="mt-3">
        <CustomerProgress row={row} />
      </div>
      <p className="mt-2.5 text-xs text-[#7A8091]">Last visit: {row.lastVisit ? formatDate(row.lastVisit) : "No visits"}</p>
    </Link>
  );
}

function CustomerAvatar({ name, tier, rewardReady }: { name: string; tier: string; rewardReady: boolean }) {
  const ring = rewardReady
    ? "ring-[#F3D9A4] bg-[#FCF0DC] text-[#854F0B]"
    : tier === "VIP" || tier === "GOLD"
      ? "ring-[#F3D9A4] bg-[#FFFBF2] text-[#854F0B]"
      : tier === "SILVER"
        ? "ring-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]"
        : "ring-[#E7E9EE] bg-[#F3F4F7] text-[#5A6070]";

  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1 ${ring}`} aria-hidden="true">
      {getInitials(name)}
    </span>
  );
}

function CustomerProgress({ row }: { row: CustomerRow }) {
  if (!row.progress) return <span className="text-sm text-[#7A8091]">No active programs</span>;
  const extraPrograms = row.activePrograms - 1;
  const extraLabel = extraPrograms > 0 ? ` · +${extraPrograms} more ${extraPrograms === 1 ? "program" : "programs"}` : "";

  if (row.rewardReady) {
    return (
      <div className="min-w-0">
        <StatusBadge tone="warning" className="whitespace-nowrap">
          <Gift className="mr-1 h-3.5 w-3.5" aria-hidden />
          Reward Ready
        </StatusBadge>
        <p className="mt-1 truncate text-xs text-[#7A8091]">
          {row.progress.programName}
          {extraLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-44">
      <ProgressBar value={row.progress.current} max={row.progress.required} />
      <p className="mt-1 truncate text-xs font-semibold text-[#7A8091]">
        {row.progress.current} / {row.progress.required} · {row.progress.programName}
        {extraLabel}
      </p>
    </div>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-11 w-full rounded-lg border border-[#E7E9EE] bg-white px-3 text-sm text-[#3D4352] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2 sm:h-10"
      >
        <option value="">{label}</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const tone = tier === "VIP" || tier === "GOLD" ? "warning" : tier === "SILVER" ? "info" : "neutral";
  return (
    <StatusBadge tone={tone} className="whitespace-nowrap">
      {friendlyTier(tier)}
    </StatusBadge>
  );
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <p
      role="status"
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${
        error ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]" : "border-[#CBEAD6] bg-[#E9F6EE] text-[#1D7A46]"
      }`}
    >
      {error ?? success}
    </p>
  );
}

function buildSegmentHref(query: string | undefined, overrides: Record<string, string>) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  for (const [key, value] of Object.entries(overrides)) {
    params.set(key, value);
  }
  const suffix = params.toString();
  return `/dashboard/customers${suffix ? `?${suffix}` : ""}`;
}

function toCustomerSummary(membership: CustomerMembershipWithRelations) {
  const progressRows = membership.programMemberships.map((programMembership) => {
    const current = programMembership.earnedStamps + programMembership.bonusStamps;
    const required = programMembership.loyaltyProgram.requiredStamps;
    return {
      current,
      required,
      programName: programMembership.loyaltyProgram.name,
      rewardReady: current >= required,
      nearReward: current < required && current >= Math.max(0, required - 2),
      lastVisit: programMembership.stampTransactions[0]?.createdAt ?? null,
    };
  });
  const progress = progressRows.sort((a, b) => b.current / Math.max(1, b.required) - a.current / Math.max(1, a.required))[0] ?? null;
  return {
    status: membership.status,
    tier: membership.currentTier,
    marketingConsent: membership.marketingConsent,
    activePrograms: membership.programMemberships.length,
    progress,
    rewardReady: progressRows.some((row) => row.rewardReady),
    nearReward: progressRows.some((row) => row.nearReward),
    lastVisit: progressRows.map((row) => row.lastVisit).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null,
    joinedAt: membership.joinedAt,
  };
}

function resolveSegment(params: CustomerSearchParams) {
  if (params.reward === "ready") return "reward";
  if (params.reward === "near") return "near";
  if (params.tier === "VIP") return "vip";
  if (params.status === "ACTIVE") return "active";
  if (params.status === "INACTIVE") return "inactive";
  if (params.consent === "no") return "noconsent";
  return "all";
}

function friendlyTier(tier: string) {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

function getCustomerName(customer: { firstName: string; lastName?: string | null }) {
  return `${customer.firstName} ${customer.lastName ?? ""}`.trim();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type CustomerMembershipWithRelations = Awaited<ReturnType<typeof prisma.businessCustomerMembership.findMany<{ include: typeof customerInclude }>>>[number];
type CustomerRow = ReturnType<typeof toCustomerSummary> & {
  raw: CustomerMembershipWithRelations;
  customerName: string;
};
