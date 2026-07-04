import Link from "next/link";
import type React from "react";
import {
  CheckCircle2,
  Search,
  ShieldCheck,
  ScanLine,
  TicketCheck,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CsrfInput } from "@/components/CsrfInput";
import { DashboardShell } from "@/components/DashboardShell";
import { DashboardPageLayout } from "@/components/layouts";
import { ButtonLink, MetricCard, PageActions, PageHeader, ProgressBar, SectionCard as UiSectionCard, StatusBadge as UiStatusBadge, Timeline, TimelineItem } from "@/components/ui";
import { getBusinessDisplayName, getBusinessTypeDisplayName } from "@/lib/business-display";
import { endSupportSessionAction } from "@/app/platform/businesses/support-actions";
import { getBusinessOwnerContext, getCurrentPlan } from "@/lib/business-owner";
import { formatDateTime } from "@/lib/format";
import { getPlanComplianceSummary, type PlanComplianceSummary } from "@/lib/plan-compliance";
import { requireSupportBusinessContext } from "@/lib/support-sessions";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";

export default async function BusinessDashboard({
  searchParams,
}: {
  searchParams: Promise<{ customerSearch?: string; supportSessionId?: string }>;
}) {
  const params = await searchParams;
  const supportContext = params.supportSessionId ? await requireSupportBusinessContext(params.supportSessionId) : null;
  const { user, business, supportSession } = supportContext ?? await getBusinessOwnerContext();
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
    pendingReferrals,
    referralConversionsToday,
    latestSupportSession,
    activeBusinessSupportSession,
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
        firstName: true,
        lastName: true,
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
        createdAt: true,
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
    prisma.referral.count({ where: { businessId: user.businessId, status: "PENDING" } }),
    prisma.referral.count({ where: { businessId: user.businessId, status: "QUALIFIED", qualifiedAt: { gte: todayStart } } }),
    prisma.supportSession.findFirst({
      where: { businessId: user.businessId },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, endedAt: true, expiresAt: true, status: true, reason: true, supportSummary: true },
    }),
    prisma.supportSession.findFirst({
      where: { businessId: user.businessId, status: "ACTIVE", endedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, expiresAt: true, status: true, reason: true },
    }),
  ]);

  const planCompliance = await getPlanComplianceSummary({
    businessId: user.businessId,
    planCode: plan?.code,
    recordAuditEvent: !supportSession?.readOnly,
  });
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
      createdAt: program.createdAt,
    };
  });
  const rewardsReadyTotal = programPerformance.reduce((sum, program) => sum + program.rewardReady, 0);
  const customersCloseToReward = programRows.reduce(
    (sum, program) => sum + program.memberships.filter((membership) => {
      const progress = membership.earnedStamps + membership.bonusStamps;
      return membership.status !== "COMPLETED" && progress < program.requiredStamps && progress >= Math.max(0, program.requiredStamps - 2);
    }).length,
    0,
  );
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
      eyebrow={supportSession ? "Support Session" : "Business Owner"}
      title="Business dashboard"
      hideWelcomeMessage
      supportSession={supportSession}
    >
      <DashboardPageLayout
        summary={
          <DashboardCommandCenter
            businessName={businessDisplayName}
            businessType={businessTypeDisplayName}
            ownerName={user.name}
            planName={plan?.name ?? "Unassigned"}
            status={business.status}
            currentDate={new Intl.DateTimeFormat("en-AE", { weekday: "long", month: "short", day: "numeric" }).format(new Date())}
            customersToday={newCustomersToday}
            logoUrl={business.branding?.logoUrl}
          />
        }
        actions={<CompactCustomerSearch />}
      >
        {!supportSession && activeBusinessSupportSession ? <ActiveSupportNotice session={activeBusinessSupportSession} /> : null}

        <TodaysOperations
          newCustomersToday={newCustomersToday}
          stampsIssuedToday={stampsIssuedToday}
          rewardsRedeemedToday={redemptionsToday}
          rewardReadyCustomers={rewardsReadyTotal}
          referralConversionsToday={referralConversionsToday}
        />

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <QuickActions />
            <ActionRequiredSection rewardReadyCustomers={rewardsReadyTotal} pendingReferrals={pendingReferrals} customersCloseToReward={customersCloseToReward} recentScannerActivity={totalActivitiesToday} alertCount={totalOpenAlerts} subscriptionStatus={business.subscriptions[0]?.status ?? "UNASSIGNED"} onboardingPercent={onboardingPercent} onboardingItems={onboardingItems} />
            <DashboardActivityTimeline customers={recentCustomers} programs={programPerformance} />
          </div>
          <div className="min-w-0 space-y-5">
            <BusinessHealthPanel customerGrowth={newCustomersToday > 0 ? "Growing today" : "Needs activity"} activePrograms={loyaltyPrograms} activeStaff={staffCount} branchCount={branchCount} subscriptionStatus={business.subscriptions[0]?.status ?? "UNASSIGNED"} branchesUsed={branchCount} branchLimit={plan?.maxBranches ?? null} programsUsed={loyaltyPrograms} programLimit={plan?.maxLoyaltyPrograms ?? null} planCompliance={planCompliance} />
            <SubscriptionSummaryCard planName={plan?.name ?? "Unassigned"} branchesUsed={branchCount} branchLimit={plan?.maxBranches ?? null} programsUsed={loyaltyPrograms} programLimit={plan?.maxLoyaltyPrograms ?? null} renewalDate={business.subscriptions[0]?.renewalDate ?? business.subscriptions[0]?.expiryDate ?? null} />
            <SupportAccessCard session={latestSupportSession} />
          </div>
        </div>
      </DashboardPageLayout>
    </DashboardShell>
  );
}


function DashboardCommandCenter({ businessName, businessType, ownerName, planName, status, currentDate, customersToday, logoUrl }: { businessName: string; businessType: string; ownerName: string; planName: string; status: string; currentDate: string; customersToday: number; logoUrl?: string | null }) {
  return (
    <UiSectionCard className="business-border-soft business-bg-soft">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border business-border-soft bg-white bg-cover bg-center text-base font-bold business-text" style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined} aria-label="Business logo">{!logoUrl ? getInitials(businessName) : null}</div>
          <div className="min-w-0">
            <PageHeader eyebrow="Daily operations" title={businessName} description={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${ownerName}. Your ${businessType.toLowerCase()} has welcomed ${customersToday} customer${customersToday === 1 ? "" : "s"} today.`} />
            <div className="mt-4 flex flex-wrap gap-2"><UiStatusBadge tone="business">{planName} Plan</UiStatusBadge><UiStatusBadge tone={status === "ACTIVE" ? "success" : "danger"}>{status}</UiStatusBadge><UiStatusBadge tone="neutral">All branches</UiStatusBadge><UiStatusBadge tone="info">{currentDate}</UiStatusBadge></div>
          </div>
        </div>
        <PageActions className="lg:justify-end"><ButtonLink href="/dashboard/scanner" variant="business" size="lg">Open Scanner</ButtonLink><div className="flex flex-wrap gap-2 pt-1 lg:justify-end"><SecondaryAction href="/dashboard/customers/new" label="Add Customer" /><SecondaryAction href="/dashboard/customers" label="Find Customer" /><SecondaryAction href="/dashboard/programs" label="Programs" /></div></PageActions>
      </div>
    </UiSectionCard>
  );
}

function ActiveSupportNotice({ session }: { session: { reason: string; expiresAt: Date } }) {
  return (
    <UiSectionCard className="border-red-200 bg-red-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-red-800">Loyalty Card UAE Support is currently assisting with your workspace.</p>
            <p className="mt-1 text-sm text-red-700">Reason: {session.reason}</p>
          </div>
        </div>
        <UiStatusBadge tone="danger">Active until {formatDateTime(session.expiresAt)}</UiStatusBadge>
      </div>
    </UiSectionCard>
  );
}

function TodaysOperations({ newCustomersToday, stampsIssuedToday, rewardsRedeemedToday, rewardReadyCustomers, referralConversionsToday }: { newCustomersToday: number; stampsIssuedToday: number; rewardsRedeemedToday: number; rewardReadyCustomers: number; referralConversionsToday: number }) {
  return <section><h2 className="mb-3 text-lg font-bold tracking-tight text-[#171A21]">Today's Operations</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"><MetricCard href="/dashboard/customers" label="New Customers Today" value={newCustomersToday} tone="business" /><MetricCard href="/dashboard/activity" label="Visits Issued Today" value={stampsIssuedToday} /><MetricCard href="/dashboard/activity" label="Rewards Redeemed Today" value={rewardsRedeemedToday} /><MetricCard href="/dashboard/customers?reward=ready" label="Reward Ready Customers" value={rewardReadyCustomers} tone={rewardReadyCustomers > 0 ? "warning" : "neutral"} /><MetricCard href="/dashboard/referrals" label="Referral Conversions Today" value={referralConversionsToday} /></div></section>;
}

function BusinessHealthPanel({ customerGrowth, activePrograms, activeStaff, branchCount, subscriptionStatus, branchesUsed, branchLimit, programsUsed, programLimit, planCompliance }: { customerGrowth: string; activePrograms: number; activeStaff: number; branchCount: number; subscriptionStatus: string; branchesUsed: number; branchLimit: number | null; programsUsed: number; programLimit: number | null; planCompliance: PlanComplianceSummary }) {
  return <UiSectionCard title="Business Health" description="Growth, team, branch, subscription, and plan usage health."><div className="grid gap-3"><HealthRow label="Customer Growth" value={customerGrowth} tone={customerGrowth === "Needs activity" ? "warning" : "success"} /><HealthRow label="Active Programs" value={activePrograms.toString()} tone={activePrograms > 0 ? "success" : "warning"} /><HealthRow label="Active Staff" value={activeStaff.toString()} tone={activeStaff > 0 ? "success" : "warning"} /><HealthRow label="Branch Status" value={branchCount + " active"} tone={branchCount > 0 ? "success" : "warning"} /><HealthRow label="Subscription Health" value={subscriptionStatus.replaceAll("_", " ")} tone={subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIAL" ? "success" : "warning"} /><PlanUsage label="Branches Used" used={branchesUsed} limit={branchLimit} /><PlanUsage label="Programs Used" used={programsUsed} limit={programLimit} /><PlanComplianceCard compliance={planCompliance} /></div></UiSectionCard>;
}

function ActionRequiredSection({ rewardReadyCustomers, pendingReferrals, customersCloseToReward, recentScannerActivity, alertCount, subscriptionStatus, onboardingPercent, onboardingItems }: { rewardReadyCustomers: number; pendingReferrals: number; customersCloseToReward: number; recentScannerActivity: number; alertCount: number; subscriptionStatus: string; onboardingPercent: number; onboardingItems: Array<{ label: string; complete: boolean; href: string }> }) {
  const subscriptionNeedsAttention = subscriptionStatus !== "ACTIVE" && subscriptionStatus !== "TRIAL" && subscriptionStatus !== "UNASSIGNED";
  const hasAction = rewardReadyCustomers + pendingReferrals + customersCloseToReward + recentScannerActivity + alertCount > 0 || subscriptionNeedsAttention || onboardingPercent < 100;
  return <UiSectionCard title="Action Required" description="Operational queues that need owner attention.">{hasAction ? <div className="grid gap-4 lg:grid-cols-2"><QueueBox title="Reward Ready Customers" count={rewardReadyCustomers} href="/dashboard/customers?reward=ready" empty="No rewards waiting right now." /><QueueBox title="Pending Referrals" count={pendingReferrals} href="/dashboard/referrals?status=PENDING" empty="No pending referrals." /><QueueBox title="Customers Close To Reward" count={customersCloseToReward} href="/dashboard/customers" empty="No customers close to reward." /><QueueBox title="Recent Scanner Activity" count={recentScannerActivity} href="/dashboard/activity" empty="No scanner activity today." />{alertCount > 0 ? <AlertRow href="/dashboard/notifications" label="Open Alerts" value={alertCount} /> : null}{subscriptionNeedsAttention ? <Link href="/dashboard/billing" className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-sm font-semibold text-[#92400E] transition hover:bg-[#FEF3C7]">Subscription / plan warning</Link> : null}{onboardingPercent < 100 ? <div className="lg:col-span-2"><OnboardingSummary percent={onboardingPercent} items={onboardingItems} /></div> : null}</div> : <p className="text-sm text-[#7A8091]">No action required.</p>}</UiSectionCard>;
}
function QuickActions() {
  return <section><h2 className="mb-3 text-lg font-bold tracking-tight text-[#171A21]">Quick Actions</h2><div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-4"><PrimaryAction href="/dashboard/scanner" icon={ScanLine} label="Open Scanner" featured /><PrimaryAction href="/dashboard/customers/new" icon={UserPlus} label="Add Customer" /><PrimaryAction href="/dashboard/customers" icon={Search} label="Find Customer" /><PrimaryAction href="/dashboard/programs" icon={TicketCheck} label="Programs" /></div></section>;
}
function DashboardActivityTimeline({ customers, programs }: { customers: Array<{ uuid: string; createdAt: Date; firstName: string; lastName: string | null }>; programs: Array<{ uuid: string; name: string; createdAt: Date }> }) {
  const items = [...customers.slice(0, 4).map((customer) => ({ title: "Customer Joined", description: getCustomerName(customer), time: customer.createdAt, href: `/dashboard/customers/${customer.uuid}` })), ...programs.slice(0, 3).map((program) => ({ title: "Program Created", description: program.name, time: program.createdAt, href: `/dashboard/programs/${program.uuid}` }))].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 6);
  return <UiSectionCard title="Recent Activity" description="Newest customer, stamp, reward, referral, program, and staff movement.">{items.length ? <Timeline>{items.map((item) => <TimelineItem key={item.title + item.description + item.time.toISOString()} title={<Link href={item.href} className="business-hover">{item.title}</Link>} time={formatDateTime(item.time)} description={item.description} />)}</Timeline> : <p className="text-sm text-[#7A8091]">No activity yet.</p>}</UiSectionCard>;
}
function SubscriptionSummaryCard({ planName, branchesUsed, branchLimit, programsUsed, programLimit, renewalDate }: { planName: string; branchesUsed: number; branchLimit: number | null; programsUsed: number; programLimit: number | null; renewalDate: Date | null }) {
  return <UiSectionCard title="Subscription Summary" description="Compact plan and usage overview."><div className="grid gap-3"><InfoLine label="Current Plan" value={planName} /><InfoLine label="Branches Used" value={formatUsage(branchesUsed, branchLimit)} /><InfoLine label="Programs Used" value={formatUsage(programsUsed, programLimit)} /><InfoLine label="Renewal Date" value={renewalDate ? formatDateTime(renewalDate) : "Not scheduled"} /><ButtonLink href="/dashboard/billing" variant="outline" className="w-full">Upgrade</ButtonLink></div></UiSectionCard>;
}

function SupportAccessCard({ session }: { session: { startedAt: Date; endedAt: Date | null; expiresAt: Date; status: string; reason: string; supportSummary: string | null } | null }) {
  return (
    <UiSectionCard title="Support Access" description="Transparent record of Loyalty Card UAE support access.">
      {session ? (
        <div className="grid gap-3">
          <InfoLine label="Last Session" value={formatDateTime(session.startedAt)} />
          <InfoLine label="Status" value={session.status.replaceAll("_", " ")} />
          <InfoLine label="Reason" value={session.reason} />
          <ButtonLink href="/dashboard/support-history" variant="outline" className="w-full">View Support History</ButtonLink>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="rounded-lg bg-[#F3F4F7] p-3 text-sm text-[#7A8091]">No support access recorded.</p>
          <ButtonLink href="/dashboard/support-history" variant="outline" className="w-full">View Support History</ButtonLink>
        </div>
      )}
    </UiSectionCard>
  );
}

function HealthRow({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "danger" }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E7E9EE] p-3"><span className="text-sm text-[#7A8091]">{label}</span><UiStatusBadge tone={tone}>{value}</UiStatusBadge></div>;
}

function PlanUsage({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const max = limit ?? Math.max(used, 1);
  const tone = limit !== null && used >= limit ? "warning" : "business";
  return <div className="rounded-lg border border-[#E7E9EE] p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm text-[#7A8091]">{label}</p><UiStatusBadge tone={tone}>{formatUsage(used, limit)}</UiStatusBadge></div><ProgressBar value={used} max={max} className="mt-3" barClassName={tone === "warning" ? "bg-[#F59E0B]" : "business-button"} /></div>;
}

function QueueBox({ title, count, href, empty }: { title: string; count: number; href: string; empty: string }) {
  return <Link href={href} className="rounded-lg border border-[#E7E9EE] p-3 transition hover:bg-[#F3F4F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E86A33] focus-visible:ring-offset-2"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[#171A21]">{title}</h3><UiStatusBadge tone={count > 0 ? "warning" : "neutral"}>{count}</UiStatusBadge></div><p className="mt-2 text-sm text-[#7A8091]">{count > 0 ? "View" : empty}</p></Link>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg bg-[#F3F4F7] p-3"><span className="text-sm text-[#7A8091]">{label}</span><span className="break-words text-right text-sm font-semibold text-[#171A21]">{value}</span></div>;
}

function AlertRow({ href, label, value }: { href: string; label: string; value: number }) {
  return <Link href={href} className="flex items-center justify-between rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 transition hover:bg-[#FEF3C7]"><span className="text-sm font-semibold text-[#92400E]">{label}</span><UiStatusBadge tone="warning">{value}</UiStatusBadge></Link>;
}

function SecondaryAction({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="rounded-full border border-[#E7E9EE] px-3 py-1.5 text-xs font-semibold text-[#5A6070] transition hover:bg-white hover:text-[#171A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E86A33] focus-visible:ring-offset-2">{label}</Link>;
}

function formatUsage(used: number, limit: number | null) {
  return limit === null ? used.toString() : used + " / " + limit;
}
function PlanComplianceCard({ compliance }: { compliance: Awaited<ReturnType<typeof getPlanComplianceSummary>> }) {
  const warning = compliance.status === "POTENTIAL_MULTI_BRANCH";
  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${warning ? "border-[#F3D9A4] bg-[#FFFBF2] text-[#B25E09]" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Plan Compliance Status</p>
        <p className="font-bold">{warning ? "Potential Multi-Branch Activity Detected" : "Compliant"}</p>
      </div>
      <p className="mt-1">
        Compliance score: {compliance.score}/100 - Detection count: {compliance.detectionCount}
      </p>
      {compliance.lastDetectedIssue ? <p className="mt-1">Last detected issue: {compliance.lastDetectedIssue}</p> : null}
    </div>
  );
}
function CompactCustomerSearch() {
  return (
    <form action="/dashboard/customers" className="max-w-full min-w-0 overflow-hidden rounded-lg border border-[#E7E9EE] bg-white p-3 shadow-sm">
      <label htmlFor="dashboard-customer-search" className="sr-only">
        Search customers
      </label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA0AD]" aria-hidden="true" />
          <input
            id="dashboard-customer-search"
            name="q"
            placeholder="Quick customer lookup: name, phone, card ID, referral code"
            className="h-11 w-full rounded-lg border border-[#E7E9EE] pl-10 pr-3 text-base outline-none business-ring focus:ring-0 sm:text-sm"
          />
        </div>
        <button type="submit" className="h-11 rounded-lg business-button px-4 text-sm font-semibold text-white">
          Search
        </button>
      </div>
    </form>
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
      <div className="inline-flex w-full max-w-xs items-center justify-between gap-3 rounded-lg border border-[#F4C7AE]/60 business-border-soft bg-[#FBEFE8] business-bg-soft px-3 py-2 shadow-sm">
        <p className="text-sm font-semibold business-primary-strong">{percent}% Complete</p>
        <Link href="/dashboard/settings" className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold business-primary shadow-sm">
          Continue Setup
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E7E9EE] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#171A21]">Onboarding checklist</p>
          <p className="mt-1 text-xs text-[#7A8091]">{percent}% complete</p>
        </div>
        <div className="h-2 w-24 rounded-full business-secondary-bg-soft">
          <div className="h-2 rounded-full business-progress" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#171A21] transition business-hover">
            <CheckCircle2 className={`h-4 w-4 ${item.complete ? "text-emerald-600" : "text-[#D8DBE2]"}`} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PrimaryAction({ href, icon: Icon, label, featured = false }: { href: string; icon: LucideIcon; label: string; featured?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-24 w-full min-w-0 items-center gap-3 rounded-lg border p-4 shadow-sm transition ${
        featured
          ? "business-border business-button text-white"
          : "border-[#E7E9EE] bg-white text-[#171A21] business-hover"
      }`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${featured ? "bg-white/15" : "bg-[#FBEFE8] business-bg-soft business-primary"}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-base font-semibold leading-tight sm:whitespace-nowrap lg:text-lg">{label}</span>
    </Link>
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






