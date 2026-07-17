import Link from "next/link";
import { CheckCircle2, Gift, ScanLine, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { BusinessLogoAvatar } from "@/components/BusinessLogoAvatar";
import { DashboardPageLayout } from "@/components/layouts";
import { ButtonLink, MetricCard, ProgressBar, SectionCard as UiSectionCard, StatusBadge as UiStatusBadge, Timeline, TimelineItem } from "@/components/ui";
import { getBusinessDisplayName, getBusinessTypeDisplayName } from "@/lib/business-display";
import { getBusinessOwnerContext, getCurrentPlan } from "@/lib/business-owner";
import { formatDate, formatDateTime } from "@/lib/format";
import { getPlanComplianceSummary, type PlanComplianceSummary } from "@/lib/plan-compliance";
import { requireSupportBusinessContext } from "@/lib/support-sessions";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";

type ServeQueueItem = {
  kind: "ready" | "almost";
  customerUuid: string;
  customerName: string;
  programName: string;
  rewardName: string;
  progress: number;
  required: number;
};

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
            businessCustomerMembership: { select: { uuid: true, firstName: true, lastName: true } },
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
  const serveQueue: ServeQueueItem[] = [];
  for (const program of programRows) {
    for (const membership of program.memberships) {
      if (membership.status === "COMPLETED") continue;
      const progress = membership.earnedStamps + membership.bonusStamps;
      const item = {
        customerUuid: membership.businessCustomerMembership.uuid,
        customerName: getCustomerName(membership.businessCustomerMembership),
        programName: program.name,
        rewardName: program.rewardName,
        progress,
        required: program.requiredStamps,
      };
      if (progress >= program.requiredStamps) {
        serveQueue.push({ kind: "ready", ...item });
      } else if (progress >= Math.max(0, program.requiredStamps - 2)) {
        serveQueue.push({ kind: "almost", ...item });
      }
    }
  }
  serveQueue.sort((a, b) => (a.kind === b.kind ? b.progress - a.progress : a.kind === "ready" ? -1 : 1));
  const visibleQueue = serveQueue.slice(0, 6);
  const stampsIssuedToday = stampsToday._sum.quantity ?? 0;
  const onboardingItems = [
    { label: "Create first branch", complete: branchCount > 0, href: "/dashboard/branches" },
    { label: "Create first staff member", complete: staffCount > 0, href: "/dashboard/staff" },
    { label: "Create first loyalty program", complete: loyaltyPrograms > 0, href: "/dashboard/programs/new" },
    { label: "Create first customer", complete: customerCount > 0, href: "/dashboard/customers/new" },
    { label: "Issue first stamp", complete: stampCount > 0, href: "/dashboard/customers" },
    { label: "Redeem first reward", complete: redemptionCount > 0, href: "/dashboard/customers" },
  ];
  const onboardingPercent = Math.round((onboardingItems.filter((item) => item.complete).length / onboardingItems.length) * 100);
  const greeting = new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening";
  const currentDate = new Intl.DateTimeFormat("en-AE", { weekday: "long", month: "short", day: "numeric" }).format(new Date());

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
          <UiSectionCard className="business-border-soft business-bg-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3.5">
                <BusinessLogoAvatar
                  logoUrl={business.branding?.logoUrl ?? null}
                  businessName={businessDisplayName}
                  fallback={getInitials(businessDisplayName)}
                  className="rounded-lg border business-border-soft bg-white business-text"
                />
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold tracking-tight text-[#171A21]">
                    Good {greeting}, {user.name} — {businessDisplayName}
                  </h2>
                  <p className="mt-0.5 hidden text-xs text-[#5A6070] md:block">
                    {currentDate} · {businessTypeDisplayName} · {plan?.name ?? "Unassigned"} Plan ·{" "}
                    <span className={business.status === "ACTIVE" ? "font-semibold text-[#1D7A46]" : "font-semibold text-[#B91C1C]"}>{business.status}</span> · All branches
                  </p>
                  <p className="mt-0.5 text-xs text-[#5A6070] md:hidden">
                    <span className="font-semibold business-primary-strong">{newCustomersToday} new</span> · {stampsIssuedToday} visits · {redemptionsToday} rewards ·{" "}
                    {referralConversionsToday} referrals today
                  </p>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-2 md:flex">
                <CustomerSearchForm className="w-56" />
                <ButtonLink href="/dashboard/customers/new" variant="outline" leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}>
                  Add Customer
                </ButtonLink>
                <ButtonLink href="/dashboard/scanner" variant="business" size="lg" leftIcon={<ScanLine className="h-5 w-5" aria-hidden="true" />}>
                  Open Scanner
                </ButtonLink>
              </div>
            </div>
          </UiSectionCard>
        }
      >
        {!supportSession && activeBusinessSupportSession ? <ActiveSupportNotice session={activeBusinessSupportSession} /> : null}

        <div className="grid gap-2 md:hidden">
          <ButtonLink href="/dashboard/scanner" variant="business" size="lg" className="w-full" leftIcon={<ScanLine className="h-5 w-5" aria-hidden="true" />}>
            Open Scanner
          </ButtonLink>
          <div className="grid grid-cols-2 gap-2">
            <ButtonLink href="/dashboard/customers/new" variant="outline" className="w-full" leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}>
              Add Customer
            </ButtonLink>
            <ButtonLink href="/dashboard/customers" variant="outline" className="w-full" leftIcon={<Users className="h-4 w-4" aria-hidden="true" />}>
              Customers
            </ButtonLink>
          </div>
          <CustomerSearchForm />
        </div>

        <section aria-label="Key numbers" className="hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-6">
          <MetricCard href="/dashboard/customers" label="New Customers Today" value={newCustomersToday} tone="business" />
          <MetricCard href="/dashboard/activity" label="Visits Issued Today" value={stampsIssuedToday} />
          <MetricCard href="/dashboard/activity" label="Rewards Redeemed Today" value={redemptionsToday} />
          <MetricCard href="/dashboard/customers?reward=ready" label="Reward Ready" value={rewardsReadyTotal} tone={rewardsReadyTotal > 0 ? "warning" : "neutral"} />
          <MetricCard href="/dashboard/customers" label="Total Customers" value={customerCount} helper="All branches" />
          <MetricCard href="/dashboard/referrals" label="Referral Conversions" value={referralConversionsToday} helper="Today" />
        </section>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <ServeNextQueue items={visibleQueue} readyTotal={rewardsReadyTotal} almostTotal={customersCloseToReward} />

          <div className="grid min-w-0 content-start gap-4">
            {totalOpenAlerts > 0 ? (
              <Link
                href="/dashboard/notifications"
                className="flex items-center justify-between gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 transition hover:bg-[#FEE2E2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2"
              >
                <span className="text-sm font-bold text-[#991B1B]">
                  {totalOpenAlerts} open {totalOpenAlerts === 1 ? "alert needs" : "alerts need"} review
                </span>
                <span className="text-xs font-semibold text-[#B91C1C]">Review →</span>
              </Link>
            ) : null}

            {pendingReferrals > 0 ? (
              <Link
                href="/dashboard/referrals?status=PENDING"
                className="flex items-center justify-between gap-3 rounded-xl border border-[#F3D9A4] bg-[#FFFBF2] px-4 py-3 transition hover:bg-[#FCF0DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2"
              >
                <span className="text-sm font-bold text-[#854F0B]">
                  {pendingReferrals} pending {pendingReferrals === 1 ? "referral" : "referrals"}
                </span>
                <span className="text-xs font-semibold text-[#B25E09]">Review →</span>
              </Link>
            ) : null}

            <AccountCard
              subscriptionStatus={business.subscriptions[0]?.status ?? "UNASSIGNED"}
              planName={plan?.name ?? "Unassigned"}
              renewalDate={business.subscriptions[0]?.renewalDate ?? business.subscriptions[0]?.expiryDate ?? null}
              customerGrowth={newCustomersToday > 0 ? "Growing today" : "Needs activity"}
              staffCount={staffCount}
              branchCount={branchCount}
              activePrograms={loyaltyPrograms}
              branchLimit={plan?.maxBranches ?? null}
              programLimit={plan?.maxLoyaltyPrograms ?? null}
              planCompliance={planCompliance}
              lastSupportSession={latestSupportSession}
            />
          </div>
        </div>

        {onboardingPercent < 100 ? <OnboardingStrip percent={onboardingPercent} items={onboardingItems} /> : null}

        <section aria-label="Programs at work">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight text-[#171A21]">Programs at work</h2>
            <Link
              href="/dashboard/programs"
              className="text-sm font-semibold business-primary-strong transition hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2"
            >
              Manage programs →
            </Link>
          </div>
          {programPerformance.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {programPerformance.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          ) : (
            <UiSectionCard>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#171A21]">No loyalty programs yet</p>
                <p className="mt-1 text-sm text-[#7A8091]">Create your first program to start rewarding customers.</p>
                <div className="mt-3 flex justify-center">
                  <ButtonLink href="/dashboard/programs/new" variant="business">
                    Create program
                  </ButtonLink>
                </div>
              </div>
            </UiSectionCard>
          )}
        </section>

        <DashboardActivityTimeline customers={recentCustomers} programs={programPerformance} />
      </DashboardPageLayout>
    </DashboardShell>
  );
}

function CustomerSearchForm({ className = "" }: { className?: string }) {
  return (
    <form action="/dashboard/customers" className={`min-w-0 ${className}`}>
      <label htmlFor="dashboard-customer-search" className="sr-only">
        Search customers
      </label>
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA0AD]" aria-hidden="true" />
        <input
          id="dashboard-customer-search"
          name="q"
          placeholder="Find a customer: name, phone, card ID"
          className="h-11 w-full rounded-lg border border-[#E7E9EE] bg-white pl-10 pr-3 text-base outline-none business-ring focus:ring-0 sm:text-sm md:h-10"
        />
      </div>
    </form>
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

function ServeNextQueue({ items, readyTotal, almostTotal }: { items: ServeQueueItem[]; readyTotal: number; almostTotal: number }) {
  const shownReady = items.filter((item) => item.kind === "ready").length;
  const shownAlmost = items.filter((item) => item.kind === "almost").length;
  const moreReady = Math.max(0, readyTotal - shownReady);
  const moreAlmost = Math.max(0, almostTotal - shownAlmost);

  return (
    <section
      aria-label="Serve next"
      className={`min-w-0 overflow-hidden rounded-xl border bg-white shadow-[0_1px_2px_rgba(15,18,25,0.04)] ${readyTotal > 0 ? "border-[#F3D9A4]" : "border-[#E7E9EE]"}`}
    >
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${readyTotal > 0 ? "border-[#F3D9A4] bg-[#FFFBF2]" : "border-[#E7E9EE]"}`}>
        <h2 className={`text-sm font-bold tracking-tight ${readyTotal > 0 ? "text-[#633806]" : "text-[#171A21]"}`}>
          Serve next{readyTotal > 0 ? ` · ${readyTotal} ${readyTotal === 1 ? "reward" : "rewards"} waiting` : ""}
        </h2>
        <p className={`text-xs ${readyTotal > 0 ? "text-[#854F0B]" : "text-[#7A8091]"}`}>Tap a customer to open their card</p>
      </div>
      {items.map((item) => (
        <Link
          key={`${item.customerUuid}-${item.programName}`}
          href={`/dashboard/customers/${item.customerUuid}`}
          className="flex items-center gap-3 border-b border-[#F3F4F7] px-4 py-2.5 transition last:border-b-0 hover:bg-[#F6F7F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--business-primary,#16A34A)]"
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              item.kind === "ready" ? "bg-[#FCF0DC] text-[#854F0B]" : "business-bg-soft business-primary-strong"
            }`}
            aria-hidden="true"
          >
            {getInitials(item.customerName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#171A21]">{item.customerName}</span>
            <span className="block truncate text-xs text-[#7A8091]">
              {item.kind === "ready" ? (
                <>
                  {item.programName} complete · owes: <span className="font-semibold text-[#171A21]">{item.rewardName}</span>
                </>
              ) : (
                <>
                  {item.programName} · {item.progress} of {item.required} stamps — {item.required - item.progress} away
                </>
              )}
            </span>
          </span>
          {item.kind === "ready" ? (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#FCF0DC] px-2.5 py-0.5 text-[11px] font-semibold text-[#854F0B]">
              <Gift className="h-3 w-3" aria-hidden="true" />
              Ready
            </span>
          ) : (
            <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border business-border-soft px-2.5 py-0.5 text-[11px] font-semibold business-primary-strong">
              Almost
            </span>
          )}
        </Link>
      ))}
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[#7A8091]">No rewards waiting and nobody close — the queue is clear.</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAFAFB] px-4 py-2.5">
        <p className="text-xs text-[#7A8091]">
          {moreReady > 0 || moreAlmost > 0
            ? `${moreReady > 0 ? `+${moreReady} more ready` : ""}${moreReady > 0 && moreAlmost > 0 ? " · " : ""}${moreAlmost > 0 ? `${moreAlmost} almost there` : ""}`
            : `${readyTotal} ready · ${almostTotal} almost there`}
        </p>
        <Link
          href="/dashboard/customers?reward=ready"
          className="text-xs font-semibold business-primary-strong transition hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2"
        >
          View all →
        </Link>
      </div>
    </section>
  );
}

function AccountCard({
  subscriptionStatus,
  planName,
  renewalDate,
  customerGrowth,
  staffCount,
  branchCount,
  activePrograms,
  branchLimit,
  programLimit,
  planCompliance,
  lastSupportSession,
}: {
  subscriptionStatus: string;
  planName: string;
  renewalDate: Date | null;
  customerGrowth: string;
  staffCount: number;
  branchCount: number;
  activePrograms: number;
  branchLimit: number | null;
  programLimit: number | null;
  planCompliance: PlanComplianceSummary;
  lastSupportSession: { startedAt: Date; status: string; reason: string } | null;
}) {
  const subscriptionHealthy = subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIAL";
  const complianceWarning = planCompliance.status === "POTENTIAL_MULTI_BRANCH";
  const programsAtLimit = programLimit !== null && activePrograms >= programLimit;
  const branchesAtLimit = branchLimit !== null && branchCount >= branchLimit;

  return (
    <UiSectionCard title="Account" description="Subscription, plan usage, compliance, and support access.">
      <div className="grid gap-2 text-sm">
        <DotLine
          tone={subscriptionHealthy ? "ok" : "danger"}
          text={
            <>
              Subscription {subscriptionStatus.replaceAll("_", " ").toLowerCase()} · {planName} Plan
              {renewalDate ? ` · renews ${formatDate(renewalDate)}` : ""}
            </>
          }
        />
        <DotLine
          tone={complianceWarning ? "warning" : "ok"}
          text={
            <>
              {complianceWarning ? "Potential multi-branch activity" : "Compliant"} · score {planCompliance.score}/100
              {planCompliance.lastDetectedIssue ? ` · ${planCompliance.lastDetectedIssue}` : ""}
            </>
          }
        />
        <DotLine
          tone={customerGrowth === "Needs activity" ? "warning" : "ok"}
          text={
            <>
              {customerGrowth} · {staffCount} staff · {branchCount} {branchCount === 1 ? "branch" : "branches"} · {activePrograms}{" "}
              {activePrograms === 1 ? "program" : "programs"}
            </>
          }
        />
      </div>

      <div className="mt-4 grid gap-3">
        <UsageBar label="Branches" used={branchCount} limit={branchLimit} atLimit={branchesAtLimit} />
        <UsageBar label="Programs" used={activePrograms} limit={programLimit} atLimit={programsAtLimit} />
      </div>

      {lastSupportSession ? (
        <p className="mt-4 border-t border-[#E7E9EE] pt-3 text-xs text-[#7A8091]">
          Support access: last session {formatDate(lastSupportSession.startedAt)} · {lastSupportSession.status.replaceAll("_", " ").toLowerCase()} ·{" "}
          {lastSupportSession.reason}
        </p>
      ) : (
        <p className="mt-4 border-t border-[#E7E9EE] pt-3 text-xs text-[#7A8091]">Support access: no support access recorded.</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ButtonLink href="/dashboard/billing" variant="outline" size="sm" className="w-full">
          Upgrade plan
        </ButtonLink>
        <ButtonLink href="/dashboard/support-history" variant="outline" size="sm" className="w-full">
          Support history
        </ButtonLink>
      </div>
    </UiSectionCard>
  );
}

function DotLine({ tone, text }: { tone: "ok" | "warning" | "danger"; text: React.ReactNode }) {
  const dot = tone === "ok" ? "bg-[#1D9E75]" : tone === "warning" ? "bg-[#EF9F27]" : "bg-[#E24B4A]";
  return (
    <p className="flex items-start gap-2 text-xs text-[#3D4352]">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="min-w-0 break-words">{text}</span>
    </p>
  );
}

function UsageBar({ label, used, limit, atLimit }: { label: string; used: number; limit: number | null; atLimit: boolean }) {
  const max = limit ?? Math.max(used, 1);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-[#7A8091]">{label}</span>
        <span className={`font-semibold tabular-nums ${atLimit ? "text-[#B25E09]" : "text-[#171A21]"}`}>
          {limit === null ? used : `${used} / ${limit}`}
          {atLimit ? " — at limit" : ""}
        </span>
      </div>
      <ProgressBar value={used} max={max} className="mt-1.5" barClassName={atLimit ? "bg-[#F59E0B]" : "business-progress"} />
    </div>
  );
}

function OnboardingStrip({ percent, items }: { percent: number; items: Array<{ label: string; complete: boolean; href: string }> }) {
  return (
    <UiSectionCard className="business-border-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-[#171A21]">Finish setting up</h2>
          <p className="mt-0.5 text-xs text-[#7A8091]">{percent}% complete</p>
        </div>
        <div className="h-2 w-32 rounded-full business-secondary-bg-soft">
          <div className="h-2 rounded-full business-progress" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2 ${
              item.complete
                ? "border-[#CBEAD6] bg-[#E9F6EE] text-[#1D7A46]"
                : "border-[#E7E9EE] bg-white text-[#5A6070] hover:border-[var(--business-primary-border,#CBEAD6)] business-hover"
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 ${item.complete ? "text-emerald-600" : "text-[#D8DBE2]"}`} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>
    </UiSectionCard>
  );
}

function ProgramCard({
  program,
}: {
  program: {
    uuid: string;
    name: string;
    members: number;
    progressPercent: number;
    rewardReady: number;
    rewardsEarned: number;
    totalStampsIssued: number;
    rewardName: string;
  };
}) {
  return (
    <Link
      href={`/dashboard/programs/${program.uuid}`}
      className="block min-w-0 rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(15,18,25,0.08)] business-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-primary,#16A34A)] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-bold tracking-tight text-[#171A21]">{program.name}</h3>
        {program.rewardReady > 0 ? (
          <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-[#FCF0DC] px-2.5 py-0.5 text-[11px] font-semibold text-[#854F0B]">
            {program.rewardReady} ready
          </span>
        ) : (
          <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-[#E7E9EE] px-2.5 py-0.5 text-[11px] font-semibold text-[#7A8091]">0 ready</span>
        )}
      </div>
      <p className="mt-1 truncate text-xs text-[#7A8091]">
        Reward: {program.rewardName} · {program.members} {program.members === 1 ? "member" : "members"}
      </p>
      <div className="mt-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-[#7A8091]">Average card fill</span>
          <span className="font-semibold tabular-nums text-[#171A21]">{program.progressPercent}%</span>
        </div>
        <ProgressBar value={program.progressPercent} className="mt-1.5" />
      </div>
      <p className="mt-3 text-xs text-[#7A8091]">
        {program.totalStampsIssued.toLocaleString("en-US")} stamps issued ·{" "}
        <span className="font-semibold text-[#171A21]">{program.rewardsEarned.toLocaleString("en-US")} rewards earned</span>
      </p>
    </Link>
  );
}

function DashboardActivityTimeline({
  customers,
  programs,
}: {
  customers: Array<{ uuid: string; createdAt: Date; firstName: string; lastName: string | null; createdBranch: { name: string } | null }>;
  programs: Array<{ uuid: string; name: string; createdAt: Date }>;
}) {
  const items = [
    ...customers.slice(0, 4).map((customer) => ({
      title: "Customer Joined",
      description: `${getCustomerName(customer)}${customer.createdBranch ? ` · ${customer.createdBranch.name}` : ""}`,
      time: customer.createdAt,
      href: `/dashboard/customers/${customer.uuid}`,
    })),
    ...programs.slice(0, 3).map((program) => ({
      title: "Program Created",
      description: program.name,
      time: program.createdAt,
      href: `/dashboard/programs/${program.uuid}`,
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 6);

  return (
    <UiSectionCard title="Recent Activity" description="Newest customer, stamp, reward, referral, program, and staff movement.">
      {items.length ? (
        <Timeline>
          {items.map((item) => (
            <TimelineItem
              key={item.title + item.description + item.time.toISOString()}
              title={
                <Link href={item.href} className="business-hover">
                  {item.title}
                </Link>
              }
              time={formatDateTime(item.time)}
              description={item.description}
            />
          ))}
        </Timeline>
      ) : (
        <p className="text-sm text-[#7A8091]">No activity yet.</p>
      )}
    </UiSectionCard>
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
