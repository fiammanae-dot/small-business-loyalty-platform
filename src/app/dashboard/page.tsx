import Link from "next/link";
import type React from "react";
import {
  CheckCircle2,
  Gift,
  Search,
  ScanLine,
  ShieldAlert,
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
    programRows,
    staffCount,
    stampCount,
    stampEventsToday,
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
    prisma.loyaltyProgram.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        uuid: true,
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
    prisma.stampTransaction.count({ where: { businessId: user.businessId, createdAt: { gte: todayStart } } }),
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
      uuid: program.uuid,
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
  const stampsIssuedToday = stampsToday._sum.quantity ?? 0;
  const totalActivitiesToday = newCustomersToday + stampEventsToday + redemptionsToday;
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
        newCustomersToday={newCustomersToday}
        stampsIssuedToday={stampsIssuedToday}
        rewardsRedeemedToday={redemptionsToday}
        rewardReadyCustomers={rewardsReadyTotal}
        logoUrl={business.branding?.logoUrl}
        onboardingPercent={onboardingPercent}
        onboardingItems={onboardingItems}
      />

      <MainActions />

      <RecentActivity
        totalActivitiesToday={totalActivitiesToday}
        stampsIssuedToday={stampsIssuedToday}
        customerEnrollmentsToday={newCustomersToday}
        rewardsRedeemedToday={redemptionsToday}
      />

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
  newCustomersToday,
  stampsIssuedToday,
  rewardsRedeemedToday,
  rewardReadyCustomers,
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
  newCustomersToday: number;
  stampsIssuedToday: number;
  rewardsRedeemedToday: number;
  rewardReadyCustomers: number;
  logoUrl?: string | null;
  onboardingPercent: number;
  onboardingItems: Array<{ label: string; complete: boolean; href: string }>;
}) {
  return (
    <section className="max-w-full min-w-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-white p-3 shadow-sm">
      <div className="grid max-w-full min-w-0 gap-3 xl:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.4fr)] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-orange-100 business-border-soft bg-orange-50 business-bg-soft bg-cover bg-center text-sm font-bold business-primary"
            style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined}
            aria-label="Business logo"
          >
            {!logoUrl ? getInitials(businessName) : null}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[#111827]">{businessName}</h2>
            <p className="mt-0.5 text-sm text-[#6B7280]">{businessType}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusBadge status={status} />
              <span className="rounded-md bg-orange-50 business-bg-soft px-2 py-1 text-xs font-semibold business-primary">{planName} Plan</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <SecondaryBusinessMetric href="/dashboard/customers" label="Customers" value={customerCount} />
              <SecondaryBusinessMetric href="/dashboard/programs" label="Programs" value={programCount} />
              <SecondaryBusinessMetric href="/dashboard/branches" label="Branches" value={branchCount} />
              <SecondaryBusinessMetric href="/dashboard/notifications" label="Alerts" value={alertCount} tone={alertCount > 0 ? "alert" : "default"} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SummaryTile href="/dashboard/customers" icon={UserPlus} label="New Customers Today" value={newCustomersToday.toString()} />
          <SummaryTile href="/dashboard/activity" icon={TicketCheck} label="Stamps Issued Today" value={stampsIssuedToday.toString()} />
          <SummaryTile href="/dashboard/activity" icon={Gift} label="Rewards Redeemed Today" value={rewardsRedeemedToday.toString()} />
          <SummaryTile href="/dashboard/customers?reward=ready" icon={ShieldAlert} label="Reward Ready Customers" value={rewardReadyCustomers.toString()} tone={rewardReadyCustomers > 0 ? "alert" : "default"} />
        </div>
      </div>

      {onboardingPercent < 100 ? <div className="mt-4"><OnboardingSummary percent={onboardingPercent} items={onboardingItems} /></div> : null}
    </section>
  );
}

function SecondaryBusinessMetric({
  href,
  label,
  value,
  tone = "default",
}: {
  href: string;
  label: string;
  value: number;
  tone?: "default" | "alert";
}) {
  return (
    <Link
      href={href}
      className={`min-w-0 break-words rounded-md px-2 py-1 text-xs font-semibold transition ${
        tone === "alert" ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-[#F3F4F6] text-[#374151] business-hover"
      }`}
    >
      {label}: {value}
    </Link>
  );
}

function CompactCustomerSearch() {
  return (
    <form action="/dashboard/customers" className="max-w-full min-w-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-white p-3 shadow-sm">
      <label htmlFor="dashboard-customer-search" className="sr-only">
        Search customers
      </label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
          <input
            id="dashboard-customer-search"
            name="q"
            placeholder="Quick customer lookup: name, phone, card ID, referral code"
            className="h-11 w-full rounded-md border border-[#E5E7EB] pl-10 pr-3 text-sm outline-none business-ring focus:ring-0"
          />
        </div>
        <button type="submit" className="h-11 rounded-md business-button px-4 text-sm font-semibold text-white">
          Search
        </button>
      </div>
    </form>
  );
}

function MainActions() {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold business-primary">Main actions</p>
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
      action={<Link href="/dashboard/customers" className="text-sm font-semibold business-primary">View All Customers</Link>}
    >
      <div className="grid gap-2">
        {customers.length ? (
          customers.map((customer) => (
            <Link key={customer.uuid} href={`/dashboard/customers/${customer.uuid}`} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-[#E5E7EB] p-3 transition business-hover">
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
    uuid: string;
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
            <Link key={program.id} href={`/dashboard/programs/${program.uuid}`} className="rounded-md border border-[#E5E7EB] p-3 transition business-hover">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-[#111827]">{program.name}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">Reward: {program.rewardName}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-[#F3F4F6] px-2 py-1 text-[#374151]">{program.members} members</span>
                  <span className="rounded-full bg-orange-50 business-bg-soft px-2 py-1 business-primary-strong">{program.rewardReady} reward ready</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{program.totalStampsIssued} stamps</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#6B7280]">
                  <span>Average completion</span>
                  <span>{program.progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full business-secondary-bg-soft">
                  <div className="h-2 rounded-full business-progress" style={{ width: `${program.progressPercent}%` }} />
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
  totalActivitiesToday,
  stampsIssuedToday,
  customerEnrollmentsToday,
  rewardsRedeemedToday,
}: {
  totalActivitiesToday: number;
  stampsIssuedToday: number;
  customerEnrollmentsToday: number;
  rewardsRedeemedToday: number;
}) {
  return (
    <SectionCard
      eyebrow="Activity"
      title="Activity preview"
      icon={TicketCheck}
      action={<Link href="/dashboard/activity" className="text-sm font-semibold business-primary">View Full Activity</Link>}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ActivityMetric label="Total activities today" value={totalActivitiesToday} href="/dashboard/activity" />
        <ActivityMetric label="Stamps issued today" value={stampsIssuedToday} href="/dashboard/activity" />
        <ActivityMetric label="Customer enrollments today" value={customerEnrollmentsToday} href="/dashboard/activity" />
        <ActivityMetric label="Rewards redeemed today" value={rewardsRedeemedToday} href="/dashboard/activity" />
      </div>
    </SectionCard>
  );
}

function ActivityMetric({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className={`h-full min-w-0 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3 transition ${href ? "cursor-pointer business-hover hover:shadow-sm" : ""}`}>
      <p className="text-2xl font-semibold text-[#111827]">{value}</p>
      <p className="mt-1 break-words text-xs font-semibold uppercase text-[#6B7280]">{label}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-md focus:outline-none business-ring">
      {content}
    </Link>
  ) : (
    content
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
      <div className="inline-flex w-full max-w-xs items-center justify-between gap-3 rounded-md border border-orange-100 business-border-soft bg-orange-50 business-bg-soft px-3 py-2 shadow-sm">
        <p className="text-sm font-semibold business-primary-strong">{percent}% Complete</p>
        <Link href="/dashboard/settings" className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-semibold business-primary shadow-sm">
          Continue Setup
        </Link>
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
        <div className="h-2 w-24 rounded-full business-secondary-bg-soft">
          <div className="h-2 rounded-full business-progress" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#111827] transition business-hover">
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
    <Link href={href} className={`min-w-0 rounded-md border px-3 py-2 transition business-hover ${tone === "alert" ? "border-red-200 bg-red-50" : "border-[#E5E7EB] bg-[#FAFAFA]"}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className={`h-4 w-4 ${tone === "alert" ? "text-red-600" : "business-primary"}`} aria-hidden="true" />
        <p className={`text-xl font-semibold ${tone === "alert" ? "text-red-700" : "text-[#111827]"}`}>{value}</p>
      </div>
      <p className="mt-1 break-words text-xs font-semibold uppercase text-[#6B7280]">{label}</p>
    </Link>
  );
}

function PrimaryAction({ href, icon: Icon, label, featured = false }: { href: string; icon: LucideIcon; label: string; featured?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-24 min-w-0 items-center gap-4 rounded-md border p-4 shadow-sm transition ${
        featured
          ? "business-border business-button text-white"
          : "border-[#E5E7EB] bg-white text-[#111827] business-hover"
      }`}
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-md ${featured ? "bg-white/15" : "bg-orange-50 business-bg-soft business-primary"}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 break-words text-lg font-semibold">{label}</span>
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
    <div className={`max-w-full min-w-0 overflow-hidden rounded-md border bg-white p-4 shadow-sm ${tone === "alert" ? "border-red-200 ring-1 ring-red-100" : "border-[#E5E7EB]"}`}>
      <div className="mb-4 flex min-w-0 items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${tone === "alert" ? "text-red-600" : "business-primary"}`}>{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">{title}</h2>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          {action}
          <span className={`flex h-10 w-10 items-center justify-center rounded-md ${tone === "alert" ? "bg-red-50 text-red-600" : "bg-orange-50 business-bg-soft business-primary"}`}>
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
      <Link href={href} className="mt-3 inline-flex rounded-md business-button px-3 py-2 text-sm font-semibold text-white">
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



