import Link from "next/link";
import type React from "react";
import {
  CheckCircle2,
  Gift,
  Search,
  ScanLine,
  ShieldAlert,
  Store,
  TicketCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getBusinessDisplayName, getBusinessTypeDisplayName } from "@/lib/business-display";
import { getBusinessOwnerContext, getCurrentPlan } from "@/lib/business-owner";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";

export default async function BusinessDashboard({
  searchParams,
}: {
  searchParams: Promise<{ customerSearch?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  await searchParams;
  const plan = getCurrentPlan(business);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    newCustomersToday,
    stampsToday,
    redemptionsToday,
    loyaltyPrograms,
    highAlerts,
    mediumAlerts,
    lowAlerts,
    recentCustomers,
    recentStamps,
    programRows,
    staffCount,
    stampCount,
    redemptionCount,
  ] = await Promise.all([
    prisma.businessCustomerMembership.count({ where: { businessId: user.businessId, createdAt: { gte: todayStart } } }),
    prisma.stampTransaction.aggregate({
      where: { businessId: user.businessId, createdAt: { gte: todayStart } },
      _sum: { quantity: true },
    }),
    prisma.rewardRedemption.count({ where: { businessId: user.businessId, redeemedAt: { gte: todayStart } } }),
    prisma.loyaltyProgram.count({ where: { businessId: user.businessId } }),
    prisma.activityAlert.count({ where: { businessId: user.businessId, status: "OPEN", severity: "HIGH" } }),
    prisma.activityAlert.count({ where: { businessId: user.businessId, status: "OPEN", severity: "MEDIUM" } }),
    prisma.activityAlert.count({ where: { businessId: user.businessId, status: "OPEN", severity: "LOW" } }),
    prisma.businessCustomerMembership.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        uuid: true,
        createdAt: true,
        status: true,
        globalCustomer: { select: { firstName: true, lastName: true } },
        createdBranch: { select: { name: true } },
      },
    }),
    prisma.stampTransaction.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        createdAt: true,
        quantity: true,
        branch: { select: { name: true } },
        customerProgramMembership: {
          select: {
            loyaltyProgram: { select: { name: true } },
            businessCustomerMembership: {
              select: { uuid: true, globalCustomer: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    }),
    prisma.loyaltyProgram.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        requiredStamps: true,
        rewardName: true,
        memberships: {
          select: {
            earnedStamps: true,
            bonusStamps: true,
            status: true,
            stampTransactions: { select: { quantity: true } },
            rewardRedemptions: { select: { id: true } },
          },
        },
      },
    }),
    prisma.user.count({ where: { businessId: user.businessId, role: { in: ["BRANCH_MANAGER", "STAFF"] } } }),
    prisma.stampTransaction.count({ where: { businessId: user.businessId } }),
    prisma.rewardRedemption.count({ where: { businessId: user.businessId } }),
  ]);

  const totalOpenAlerts = highAlerts + mediumAlerts + lowAlerts;
  const customerCount = business._count.customerMemberships;
  const branchCount = business._count.branches;
  const businessDisplayName = getBusinessDisplayName(business.name);
  const businessTypeDisplayName = getBusinessTypeDisplayName(businessTypeLabels[business.businessType]);
  const programPerformance = programRows.map((program) => {
    const memberCount = program.memberships.length;
    const averageProgress =
      memberCount === 0
        ? 0
        : program.memberships.reduce((sum, membership) => sum + membership.earnedStamps + membership.bonusStamps, 0) /
          memberCount;
    const rewardReady = program.memberships.filter(
      (membership) => membership.status !== "COMPLETED" && membership.earnedStamps + membership.bonusStamps >= program.requiredStamps,
    ).length;
    const totalStampsIssued = program.memberships.reduce(
      (sum, membership) =>
        sum + membership.stampTransactions.reduce((stampSum, transaction) => stampSum + transaction.quantity, 0),
      0,
    );

    return {
      id: program.id,
      name: program.name,
      members: memberCount,
      progressPercent: Math.min(100, Math.round((averageProgress / program.requiredStamps) * 100)),
      rewardReady,
      rewardsEarned: program.memberships.reduce((sum, membership) => sum + membership.rewardRedemptions.length, 0),
      totalStampsIssued,
      rewardName: program.rewardName,
    };
  });
  const rewardsReadyTotal = programPerformance.reduce((sum, program) => sum + program.rewardReady, 0);
  const recentActivity = [
    ...recentCustomers.map((membership) => ({
      type: "Customer enrolled",
      title: getCustomerName(membership.globalCustomer),
      meta: membership.createdBranch?.name ?? "No branch",
      createdAt: membership.createdAt,
      icon: Users,
      href: `/dashboard/customers/${membership.uuid}`,
    })),
    ...recentStamps.map((stamp) => ({
      type: `${stamp.quantity} stamp${stamp.quantity === 1 ? "" : "s"} issued`,
      title: getCustomerName(stamp.customerProgramMembership.businessCustomerMembership.globalCustomer),
      meta: `${stamp.customerProgramMembership.loyaltyProgram.name} - ${stamp.branch?.name ?? "No branch"}`,
      createdAt: stamp.createdAt,
      icon: TicketCheck,
      href: `/dashboard/customers/${stamp.customerProgramMembership.businessCustomerMembership.uuid}`,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);
  const onboardingItems = [
    { label: "Create first branch", complete: branchCount > 0, href: "/dashboard/branches" },
    { label: "Create first staff member", complete: staffCount > 0, href: "/dashboard/staff" },
    { label: "Create first loyalty program", complete: loyaltyPrograms > 0, href: "/dashboard/programs/new" },
    { label: "Create first customer", complete: customerCount > 0, href: "/dashboard/customers/new" },
    { label: "Issue first stamp", complete: stampCount > 0, href: "/dashboard/customers" },
    { label: "Redeem first reward", complete: redemptionCount > 0, href: "/dashboard/customers" },
  ];
  const onboardingPercent = Math.round((onboardingItems.filter((item) => item.complete).length / onboardingItems.length) * 100);

  return (
    <DashboardShell
      user={user}
      eyebrow="Business Owner"
      title="Business dashboard"
      hideWelcomeMessage
      headerAside={
        <TodayPerformance
          newCustomersToday={newCustomersToday}
          stampsIssuedToday={stampsToday._sum.quantity ?? 0}
          rewardsRedeemedToday={redemptionsToday}
          rewardReadyCustomers={rewardsReadyTotal}
        />
      }
    >
      <CompactCustomerSearch />

      <HeaderSummary
        businessName={businessDisplayName}
        businessType={businessTypeDisplayName}
        planName={plan?.name ?? "Unassigned"}
        status={business.status}
        customerCount={customerCount}
        programCount={loyaltyPrograms}
        branchCount={branchCount}
        alertCount={totalOpenAlerts}
        logoUrl={business.branding?.logoUrl}
        onboardingPercent={onboardingPercent}
        onboardingItems={onboardingItems}
      />

      <MainActions />

      <RecentActivity items={recentActivity} />

      <RecentCustomers customers={recentCustomers} />

      <ProgramPerformance programs={programPerformance} />
    </DashboardShell>
  );
}

function HeaderSummary({
  businessName,
  businessType,
  planName,
  status,
  customerCount,
  programCount,
  branchCount,
  alertCount,
  logoUrl,
  onboardingPercent,
  onboardingItems,
}: {
  businessName: string;
  businessType: string;
  planName: string;
  status: "ACTIVE" | "INACTIVE";
  customerCount: number;
  programCount: number;
  branchCount: number;
  alertCount: number;
  logoUrl?: string | null;
  onboardingPercent: number;
  onboardingItems: Array<{ label: string; complete: boolean; href: string }>;
}) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.25fr)] xl:items-start">
        <div className="flex gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-orange-100 bg-orange-50 bg-cover bg-center text-base font-bold text-[#F97316]"
            style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined}
            aria-label="Business logo"
          >
            {!logoUrl ? getInitials(businessName) : null}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[#F97316]">Operations control panel</p>
            <h2 className="mt-1 truncate text-2xl font-semibold text-[#111827]">{businessName}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">{businessType}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={status} />
              <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-[#F97316]">{planName} Plan</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile href="/dashboard/customers" icon={Users} label="Customers" value={customerCount.toString()} />
          <SummaryTile href="/dashboard/programs" icon={Gift} label="Programs" value={programCount.toString()} />
          <SummaryTile href="/dashboard/branches" icon={Store} label="Branches" value={branchCount.toString()} />
          <SummaryTile href="/dashboard/notifications" icon={ShieldAlert} label="Alerts" value={alertCount.toString()} tone={alertCount > 0 ? "alert" : "default"} />
        </div>
      </div>

      {onboardingPercent < 100 ? <div className="mt-4"><OnboardingSummary percent={onboardingPercent} items={onboardingItems} /></div> : null}
    </section>
  );
}

function CompactCustomerSearch() {
  return (
    <form action="/dashboard/customers" className="rounded-md border border-[#E5E7EB] bg-white p-3 shadow-sm">
      <label htmlFor="dashboard-customer-search" className="sr-only">
        Search customers
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
          <input
            id="dashboard-customer-search"
            name="q"
            placeholder="Quick customer lookup: name, phone, card ID, referral code"
            className="h-11 w-full rounded-md border border-[#E5E7EB] pl-10 pr-3 text-sm outline-none focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
          />
        </div>
        <button type="submit" className="h-11 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white">
          Search
        </button>
      </div>
    </form>
  );
}

function TodayPerformance({
  newCustomersToday,
  stampsIssuedToday,
  rewardsRedeemedToday,
  rewardReadyCustomers,
}: {
  newCustomersToday: number;
  stampsIssuedToday: number;
  rewardsRedeemedToday: number;
  rewardReadyCustomers: number;
}) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#F97316]">Today's Operations</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniOperation label="New customers" value={newCustomersToday.toString()} />
        <MiniOperation label="Stamps issued" value={stampsIssuedToday.toString()} />
        <MiniOperation label="Rewards redeemed" value={rewardsRedeemedToday.toString()} />
        <MiniOperation label="Reward ready" value={rewardReadyCustomers.toString()} />
      </div>
    </section>
  );
}

function MiniOperation({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#FAFAFA] px-3 py-2">
      <p className="text-xl font-semibold text-[#111827]">{value}</p>
      <p className="mt-1 text-xs font-medium text-[#6B7280]">{label}</p>
    </div>
  );
}

function MainActions() {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#F97316]">Main actions</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Quick Actions</h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PrimaryAction href="/dashboard/customers/new" icon={UserPlus} label="Add Customer" />
        <PrimaryAction href="/dashboard/scanner" icon={ScanLine} label="Open Scanner" featured />
        <PrimaryAction href="/dashboard/customers?reward=ready" icon={Gift} label="Redeem Reward" />
        <PrimaryAction href="/dashboard/customers" icon={Users} label="View Customers" />
      </div>
    </section>
  );
}

function RecentCustomers({
  customers,
}: {
  customers: Array<{
    uuid: string;
    createdAt: Date;
    status: "ACTIVE" | "INACTIVE" | "BLOCKED";
    globalCustomer: { firstName: string; lastName: string | null };
    createdBranch: { name: string } | null;
  }>;
}) {
  return (
    <SectionCard
      eyebrow="Customers"
      title="Recent customers"
      icon={Users}
      action={<Link href="/dashboard/customers" className="text-sm font-semibold text-[#F97316]">View All Customers</Link>}
    >
      <div className="grid gap-2">
        {customers.length ? (
          customers.map((customer) => (
            <Link key={customer.uuid} href={`/dashboard/customers/${customer.uuid}`} className="flex items-center justify-between gap-3 rounded-md border border-[#E5E7EB] p-3 transition hover:border-[#F97316] hover:bg-orange-50">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111827]">{getCustomerName(customer.globalCustomer)}</p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  {customer.createdBranch?.name ?? "No branch"} - {formatDateTime(customer.createdAt)}
                </p>
              </div>
              <StatusBadge status={customer.status} />
            </Link>
          ))
        ) : (
          <EmptyState text="No customers yet." href="/dashboard/customers/new" action="Add Customer" />
        )}
      </div>
    </SectionCard>
  );
}

function ProgramPerformance({
  programs,
}: {
  programs: Array<{
    id: number;
    name: string;
    members: number;
    progressPercent: number;
    rewardReady: number;
    rewardsEarned: number;
    totalStampsIssued: number;
    rewardName: string;
  }>;
}) {
  return (
    <SectionCard eyebrow="Programs" title="Loyalty program performance" icon={Gift}>
      <div className="grid gap-3">
        {programs.length ? (
          programs.map((program) => (
            <Link key={program.id} href={`/dashboard/programs/${program.id}`} className="rounded-md border border-[#E5E7EB] p-3 transition hover:border-[#F97316] hover:bg-orange-50">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-[#111827]">{program.name}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">Reward: {program.rewardName}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-[#F3F4F6] px-2 py-1 text-[#374151]">{program.members} members</span>
                  <span className="rounded-full bg-orange-50 px-2 py-1 text-[#C2410C]">{program.rewardReady} reward ready</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{program.totalStampsIssued} stamps</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#6B7280]">
                  <span>Average completion</span>
                  <span>{program.progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-orange-100">
                  <div className="h-2 rounded-full bg-[#F97316]" style={{ width: `${program.progressPercent}%` }} />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <EmptyState text="No loyalty programs yet." href="/dashboard/programs/new" action="Create Program" />
        )}
      </div>
    </SectionCard>
  );
}

function RecentActivity({
  items,
}: {
  items: Array<{ type: string; title: string; meta: string; createdAt: Date; icon: LucideIcon; href: string }>;
}) {
  return (
    <SectionCard
      eyebrow="Activity"
      title="Activity summary"
      icon={TicketCheck}
      action={<Link href="/dashboard/activity" className="text-sm font-semibold text-[#F97316]">View all activity</Link>}
    >
      <div className="grid gap-2">
        {items.length ? (
          items.slice(0, 3).map((item, index) => (
            <Link key={`${item.type}-${item.createdAt.toISOString()}-${index}`} href={item.href} className="flex gap-3 rounded-md border border-[#E5E7EB] p-3 transition hover:border-[#F97316] hover:bg-orange-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-[#111827]">{item.type}</p>
                  <p className="text-xs text-[#6B7280]">{formatDateTime(item.createdAt)}</p>
                </div>
                <p className="mt-1 truncate text-sm text-[#111827]">{item.title}</p>
                <p className="mt-1 text-xs text-[#6B7280]">{item.meta}</p>
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">No recent customer or stamp activity yet.</p>
        )}
      </div>
    </SectionCard>
  );
}

function OnboardingSummary({
  percent,
  items,
}: {
  percent: number;
  items: Array<{ label: string; complete: boolean; href: string }>;
}) {
  if (percent > 80) {
    return (
      <div className="rounded-md border border-orange-100 bg-orange-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#9A3412]">Setup almost complete - {percent}%</p>
            <p className="mt-1 text-xs text-[#C2410C]">Finish the remaining setup items when ready.</p>
          </div>
          <Link href="/dashboard/settings" className="shrink-0 rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#F97316] shadow-sm">
            View Details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Onboarding checklist</p>
          <p className="mt-1 text-xs text-[#6B7280]">{percent}% complete</p>
        </div>
        <div className="h-2 w-24 rounded-full bg-orange-100">
          <div className="h-2 rounded-full bg-[#F97316]" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#111827] transition hover:bg-orange-50">
            <CheckCircle2 className={`h-4 w-4 ${item.complete ? "text-emerald-600" : "text-[#D1D5DB]"}`} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function SummaryTile({
  href,
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "default" | "alert";
}) {
  return (
    <Link href={href} className={`rounded-md border p-3 transition hover:border-[#F97316] hover:bg-orange-50 ${tone === "alert" ? "border-red-200 bg-red-50" : "border-[#E5E7EB] bg-[#FAFAFA]"}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className={`h-5 w-5 ${tone === "alert" ? "text-red-600" : "text-[#F97316]"}`} aria-hidden="true" />
        <p className={`text-2xl font-semibold ${tone === "alert" ? "text-red-700" : "text-[#111827]"}`}>{value}</p>
      </div>
      <p className="mt-2 text-xs font-semibold uppercase text-[#6B7280]">{label}</p>
    </Link>
  );
}

function PrimaryAction({ href, icon: Icon, label, featured = false }: { href: string; icon: LucideIcon; label: string; featured?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-24 items-center gap-4 rounded-md border p-4 shadow-sm transition ${
        featured
          ? "border-[#F97316] bg-[#F97316] text-white hover:bg-orange-600"
          : "border-[#E5E7EB] bg-white text-[#111827] hover:border-[#F97316] hover:bg-orange-50"
      }`}
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-md ${featured ? "bg-white/15" : "bg-orange-50 text-[#F97316]"}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold">{label}</span>
    </Link>
  );
}

function SectionCard({
  eyebrow,
  title,
  icon: Icon,
  action,
  children,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "alert";
}) {
  return (
    <div className={`rounded-md border bg-white p-4 shadow-sm ${tone === "alert" ? "border-red-200 ring-1 ring-red-100" : "border-[#E5E7EB]"}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${tone === "alert" ? "text-red-600" : "text-[#F97316]"}`}>{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {action}
          <span className={`flex h-10 w-10 items-center justify-center rounded-md ${tone === "alert" ? "bg-red-50 text-red-600" : "bg-orange-50 text-[#F97316]"}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">
      <p>{text}</p>
      <Link href={href} className="mt-3 inline-flex rounded-md bg-[#F97316] px-3 py-2 text-sm font-semibold text-white">
        {action}
      </Link>
    </div>
  );
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


