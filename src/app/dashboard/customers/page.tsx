import Link from "next/link";
import { ChevronRight, MessageCircle, QrCode, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  ButtonLink,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  EmptyState,
  FilterBar,
  MetricCard,
  PageActions,
  PageIntro,
  ProgressBar,
  SearchBar,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { customerSourceLabels } from "@/lib/customers";
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
                { globalCustomer: { firstName: { contains: query, mode: "insensitive" } } },
                { globalCustomer: { lastName: { contains: query, mode: "insensitive" } } },
                { globalCustomer: { phone: { contains: query, mode: "insensitive" } } },
                { globalCustomer: { normalizedPhone: { contains: query, mode: "insensitive" } } },
                ...(normalizedQueryPhone ? [{ globalCustomer: { normalizedPhone: normalizedQueryPhone } }] : []),
                { globalCustomer: { email: { contains: query, mode: "insensitive" } } },
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
    customerName: getCustomerName(membership.globalCustomer),
  }));
  const customerRows = rowsWithUrls.filter((row) => {
    if (rewardFilter === "ready") return row.rewardReady;
    if (rewardFilter === "near") return row.nearReward;
    return true;
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Customers" hideWelcomeMessage>
      <div className="space-y-5 pb-24 md:pb-0">
        <Message error={params.error} success={params.success} />

        <SectionCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <PageIntro description="Manage your customers, loyalty progress, referrals and rewards." eyebrow="Customer Management Center" />
            <PageActions>
              <ButtonLink href="/dashboard/customers/new" variant="business"><UserPlus className="h-4 w-4" aria-hidden />Add Customer</ButtonLink>
              <ButtonLink href="/dashboard/exports/customers" variant="outline">Export Customers</ButtonLink>
              <ButtonLink href="/dashboard/scanner" variant="outline"><QrCode className="h-4 w-4" aria-hidden />Open Scanner</ButtonLink>
            </PageActions>
          </div>
        </SectionCard>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <MetricCard href="/dashboard/customers" label="Total Customers" value={allRows.length} tone="business" />
          <MetricCard href="/dashboard/customers?status=ACTIVE" label="Active Customers" value={allRows.filter((row) => row.status === "ACTIVE").length} />
          <MetricCard href="/dashboard/customers?reward=ready" label="Reward Ready" value={allRows.filter((row) => row.rewardReady).length} tone="warning" />
          <MetricCard href="/dashboard/customers?tier=VIP" label="VIP Customers" value={allRows.filter((row) => row.tier === "VIP").length} />
          <MetricCard href="/dashboard/customers" label="New This Month" value={allRows.filter((row) => row.joinedAt >= monthStart).length} />
        </section>

        <SectionCard title="Search customer" description="Find customers by name, phone, referral code, card number, or program.">
          <form action="/dashboard/customers" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <SearchBar label="Search" name="q" defaultValue={params.q ?? ""} placeholder="Search by name, phone number, referral code or card number..." className="text-base" />
            <button type="submit" className="h-11 rounded-md business-button px-6 text-sm font-semibold text-white">Search</button>
          </form>
        </SectionCard>

        <FilterBar
          title="Customer filters"
          action="/dashboard/customers"
          actions={
            <>
              <button type="submit" className="h-10 rounded-md border business-border px-4 text-sm font-semibold business-text">Apply</button>
              <Link href="/dashboard/customers" className="inline-flex h-10 items-center rounded-md border border-[#E2E8F0] px-4 text-sm font-semibold text-[#334155]">Clear</Link>
            </>
          }
        >
          <HiddenInput name="q" value={params.q} />
          <Select name="branch" value={params.branch} options={[["", "All branches"], ...business.branches.map((branch) => [String(branch.id), branch.name] as [string, string])]} />
          <Select name="program" value={params.program} options={[["", "All programs"], ...programs.map((program) => [program.uuid, program.name] as [string, string])]} />
          <Select name="tier" value={params.tier} options={[["", "All tiers"], ["BRONZE", "Bronze"], ["SILVER", "Silver"], ["GOLD", "Gold"], ["VIP", "VIP"]]} />
          <Select name="status" value={params.status} options={[["", "All statuses"], ["ACTIVE", "Active"], ["INACTIVE", "Inactive"], ["BLOCKED", "Blocked"]]} />
          <Select name="reward" value={params.reward} options={[["", "All reward states"], ["ready", "Reward ready"], ["near", "Near reward"]]} />
          <Select name="consent" value={params.consent} options={[["", "All consent"], ["yes", "Consented"], ["no", "No consent"]]} />
        </FilterBar>

        <SavedViews activeView={resolveSavedView(params)} />

        <SectionCard
          title="Customer Directory"
          description={`Showing ${customerRows.length} customer${customerRows.length === 1 ? "" : "s"}`}
          actions={<span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#64748B]">Bulk actions ready</span>}
        >
          {customerRows.length ? (
            <>
              <div className="hidden lg:block">
                <DataTable>
                  <DataTableHeader>
                    <tr>
                      {[
                        "Customer",
                        "Tier",
                        "Programs",
                        "Progress",
                        "Last Visit",
                        "Status",
                        "",
                      ].map((heading) => <DataTableHeadCell key={heading}>{heading}</DataTableHeadCell>)}
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {customerRows.map((row) => <CustomerTableRow key={row.raw.id} row={row} />)}
                  </DataTableBody>
                </DataTable>
              </div>
              <div className="grid gap-3 lg:hidden">
                {customerRows.map((row) => <CustomerMobileCard key={row.raw.id} row={row} />)}
              </div>
            </>
          ) : (
            <EmptyState
              title="No customers found"
              description="Add a customer or clear filters to see every customer in your business."
              action={<ButtonLink href="/dashboard/customers/new" variant="business">Add Customer</ButtonLink>}
            />
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}

const customerInclude = {
  globalCustomer: true,
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
    <tr className="group cursor-pointer transition hover:bg-[#F8FAFC] focus-within:bg-[#F8FAFC]">
      <DataTableCell>
        <Link href={customerHref} className="block rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2" aria-label={`Open ${row.customerName} Customer 360`}>
          <span className="font-semibold text-[#0F172A] transition group-hover:business-text">{row.customerName}</span>
          <span className="mt-1 block text-xs text-[#64748B]">{formatUaePhoneDisplay(row.raw.globalCustomer.normalizedPhone)}</span>
        </Link>
      </DataTableCell>
      <DataTableCell>
        <Link href={customerHref} className="block rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2">
          <TierBadge tier={row.tier} />
        </Link>
      </DataTableCell>
      <DataTableCell>
        <Link href={customerHref} className="block rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2">{row.activePrograms} active</Link>
      </DataTableCell>
      <DataTableCell>
        <Link href={customerHref} className="block rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2"><CustomerProgress row={row} /></Link>
      </DataTableCell>
      <DataTableCell>
        <Link href={customerHref} className="block rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2">{row.lastVisit ? formatDate(row.lastVisit) : "No visits"}</Link>
      </DataTableCell>
      <DataTableCell>
        <Link href={customerHref} className="block rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2">
          <StatusBadge tone={row.status === "ACTIVE" ? "success" : row.status === "BLOCKED" ? "danger" : "neutral"}>{row.status}</StatusBadge>
        </Link>
      </DataTableCell>
      <DataTableCell className="w-12 text-right">
        <Link href={customerHref} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#94A3B8] transition hover:bg-white hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2" aria-label={`Open ${row.customerName} Customer 360`}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </DataTableCell>
    </tr>
  );
}

function CustomerMobileCard({ row }: { row: CustomerRow }) {
  return (
    <Link href={`/dashboard/customers/${row.raw.uuid}`} className="block rounded-md border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:border-[var(--business-primary)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary)] focus-visible:ring-offset-2" aria-label={`Open ${row.customerName} Customer 360`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[#0F172A]">{row.customerName}</p>
          <p className="mt-1 text-sm text-[#64748B]">{formatUaePhoneDisplay(row.raw.globalCustomer.normalizedPhone)}</p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden />
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><TierBadge tier={row.tier} /><StatusBadge tone={row.status === "ACTIVE" ? "success" : row.status === "BLOCKED" ? "danger" : "neutral"}>{row.status}</StatusBadge>{row.rewardReady ? <StatusBadge tone="warning">Reward Ready</StatusBadge> : null}</div>
      <div className="mt-4"><CustomerProgress row={row} /></div>
      <p className="mt-3 text-sm text-[#64748B]">Last visit: {row.lastVisit ? formatDate(row.lastVisit) : "No visits"}</p>
    </Link>
  );
}

function CustomerProgress({ row }: { row: CustomerRow }) {
  if (!row.progress) return <span className="text-sm text-[#64748B]">No active programs</span>;
  if (row.rewardReady) return <StatusBadge tone="warning"><MessageCircle className="mr-1 h-3.5 w-3.5" aria-hidden />Reward Ready</StatusBadge>;
  return (
    <div className="min-w-36">
      <ProgressBar value={row.progress.current} max={row.progress.required} />
      <p className="mt-1 text-xs font-semibold text-[#64748B]">{row.progress.current} / {row.progress.required}</p>
    </div>
  );
}

function SavedViews({ activeView }: { activeView: string }) {
  const views = [
    ["all", "All Customers", "/dashboard/customers"],
    ["reward", "Reward Ready", "/dashboard/customers?reward=ready"],
    ["vip", "VIP", "/dashboard/customers?tier=VIP"],
    ["recent", "Recently Joined", "/dashboard/customers"],
    ["inactive", "Inactive", "/dashboard/customers?status=INACTIVE"],
    ["near", "Near Reward", "/dashboard/customers?reward=near"],
  ];
  return <nav aria-label="Saved customer views" className="flex gap-2 overflow-x-auto pb-1">{views.map(([key, label, href]) => <Link key={key} href={href} className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition ${activeView === key ? "business-button text-white" : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]"}`}>{label}</Link>)}</nav>;
}

function Select({ name, value, options }: { name: string; value?: string; options: [string, string][] }) {
  return <select name={name} defaultValue={value ?? ""} className="h-10 rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#334155] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2">{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>;
}

function HiddenInput({ name, value }: { name: string; value?: string }) {
  return value ? <input type="hidden" name={name} value={value} /> : null;
}

function TierBadge({ tier }: { tier: string }) {
  const tone = tier === "VIP" || tier === "GOLD" ? "warning" : tier === "SILVER" ? "info" : "neutral";
  return <StatusBadge tone={tone}>{friendlyTier(tier)}</StatusBadge>;
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>;
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
    activePrograms: membership.programMemberships.length,
    progress,
    rewardReady: progressRows.some((row) => row.rewardReady),
    nearReward: progressRows.some((row) => row.nearReward),
    lastVisit: progressRows.map((row) => row.lastVisit).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null,
    joinedAt: membership.joinedAt,
  };
}

function resolveSavedView(params: CustomerSearchParams) {
  if (params.reward === "ready") return "reward";
  if (params.reward === "near") return "near";
  if (params.tier === "VIP") return "vip";
  if (params.status === "INACTIVE") return "inactive";
  return "all";
}

function friendlyTier(tier: string) {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

function getCustomerName(customer: { firstName: string; lastName?: string | null }) {
  return `${customer.firstName} ${customer.lastName ?? ""}`.trim();
}

type CustomerMembershipWithRelations = Awaited<ReturnType<typeof prisma.businessCustomerMembership.findMany<{ include: typeof customerInclude }>>>[number];
type CustomerRow = ReturnType<typeof toCustomerSummary> & {
  raw: CustomerMembershipWithRelations;
  customerName: string;
};
