import Link from "next/link";
import Image from "next/image";
import type React from "react";
import {
  CalendarDays,
  CreditCard,
  Crown,
  Gift,
  History,
  ShieldAlert,
  Sparkles,
  TicketCheck,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { CardShareActions } from "@/components/CardShareActions";
import { CopyButton } from "@/components/CopyButton";
import { CsrfInput } from "@/components/CsrfInput";
import { StatusBadge } from "@/components/StatusBadge";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { activityHref, staffProfileHref } from "@/lib/alert-investigation";
import { alertTypeLabel } from "@/lib/alert-labels";
import { getCardUrl, getShortCardToken } from "@/lib/customer-cards";
import { calculateCustomerTier } from "@/lib/customer-tiers";
import { customerSourceLabels, getBusinessCustomerOrRedirect } from "@/lib/customers";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatUaePhoneDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { getScanQrDataUrl, getScanUrl, scanStatusLabel } from "@/lib/scan";
import { toggleCustomerCardAction, toggleProgramScanTokenAction } from "@/app/dashboard/actions";

type TimelineItem = {
  id: string;
  createdAt: Date;
  title: string;
  detail: string;
  href: string | null;
  highlighted: boolean;
  icon: LucideIcon;
  tone: "default" | "alert" | "success";
};

export default async function CustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; alert?: string; highlightTransaction?: string; tab?: string }>;
}) {
  const { user, business } = await getBusinessOwnerContext();
  const { id } = await params;
  const qs = await searchParams;
  const membership = await getBusinessCustomerOrRedirect(id, user.businessId);
  const highlightedTransactionId = qs.highlightTransaction ? Number(qs.highlightTransaction) : null;
  const highlightedAlertId = qs.alert ? Number(qs.alert) : null;
  const customer = membership.globalCustomer;
  const cardUrl = await getCardUrl(membership.cardToken);
  const nextCardStatus = membership.cardStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
  const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();

  const programCards = await Promise.all(
    membership.programMemberships.map(async (programMembership) => ({
      programMembership,
      scanUrl: await getScanUrl(programMembership.scanToken),
      qrCode: await getScanQrDataUrl(programMembership.scanToken),
      nextScanStatus: programMembership.scanStatus === "ACTIVE" ? "DISABLED" : "ACTIVE",
      membershipUuid: membership.uuid,
    })),
  );
  const programMembershipIds = membership.programMemberships.map((programMembership) => programMembership.id);

  const [stampTransactions, generatedAlerts, rewardRedemptions] = await Promise.all([
    prisma.stampTransaction.findMany({
      where: {
        businessId: user.businessId,
        customerProgramMembershipId: { in: programMembershipIds.length ? programMembershipIds : [-1] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        branch: true,
        issuedByUser: true,
        customerProgramMembership: { include: { loyaltyProgram: true } },
      },
    }),
    prisma.activityAlert.findMany({
      where: {
        businessId: user.businessId,
        customerProgramMembershipId: { in: programMembershipIds.length ? programMembershipIds : [-1] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        branch: true,
        user: true,
        customerProgramMembership: { include: { loyaltyProgram: true } },
      },
    }),
    prisma.rewardRedemption.findMany({
      where: {
        businessId: user.businessId,
        customerProgramMembershipId: { in: programMembershipIds.length ? programMembershipIds : [-1] },
      },
      orderBy: { redeemedAt: "desc" },
      include: {
        branch: true,
        redeemedByUser: true,
        loyaltyProgram: true,
      },
    }),
  ]);

  const totalEarnedStamps = membership.programMemberships.reduce((sum, programMembership) => sum + programMembership.earnedStamps, 0);
  const totalBonusStamps = membership.programMemberships.reduce((sum, programMembership) => sum + programMembership.bonusStamps, 0);
  const activePrograms = membership.programMemberships.filter((programMembership) => programMembership.status === "ACTIVE").length;
  const rewardsReady = membership.programMemberships.filter(
    (programMembership) =>
      programMembership.status !== "COMPLETED" &&
      progressValue(programMembership.earnedStamps, programMembership.bonusStamps) >= programMembership.loyaltyProgram.requiredStamps,
  ).length;
  const lastActivityDate =
    [membership.joinedAt, ...membership.programMemberships.map((programMembership) => programMembership.enrolledAt), ...stampTransactions.map((transaction) => transaction.createdAt), ...generatedAlerts.map((alert) => alert.createdAt)]
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const customerTier = calculateCustomerTier({
    visitEvents: stampTransactions.map((transaction) => transaction.createdAt),
    config: business.tierSetting,
    achievedTier: membership.currentTier,
  });
  if (membership.currentTier !== customerTier.storedTier) {
    await prisma.businessCustomerMembership.update({
      where: { id: membership.id },
      data: { currentTier: customerTier.storedTier, tierUpdatedAt: new Date() },
    });
  }

  const timeline: TimelineItem[] = [
    {
      id: `joined-${membership.id}`,
      createdAt: membership.joinedAt,
      title: "Customer enrolled",
      detail: customerName,
      href: null,
      highlighted: false,
      icon: UserRound,
      tone: "success" as const,
    },
    ...rewardRedemptions.map((redemption) => ({
      id: `redemption-${redemption.id}`,
      createdAt: redemption.redeemedAt,
      title: `${redemption.rewardName} redeemed at ${redemption.branch?.name ?? "No branch"} by ${redemption.redeemedByUser.name}`,
      detail: redemption.loyaltyProgram.name,
      href: null,
      highlighted: false,
      icon: Gift,
      tone: "success" as const,
    })),
    ...membership.programMemberships.map((programMembership) => ({
      id: `program-${programMembership.id}`,
      createdAt: programMembership.enrolledAt,
      title: "Program enrollment",
      detail: programMembership.loyaltyProgram.name,
      href: `/dashboard/programs/${programMembership.loyaltyProgram.uuid}`,
      highlighted: false,
      icon: Gift,
      tone: "default" as const,
    })),
    ...stampTransactions.map((transaction) => ({
      id: `stamp-${transaction.id}`,
      createdAt: transaction.createdAt,
      title: `${transaction.quantity} stamp${transaction.quantity === 1 ? "" : "s"} issued at ${transaction.branch?.name ?? "No branch"} by ${transaction.issuedByUser.name}`,
      detail: transaction.customerProgramMembership.loyaltyProgram.name,
      href: activityHref(transaction.id, highlightedAlertId ?? undefined),
      highlighted: highlightedTransactionId === transaction.id,
      icon: TicketCheck,
      tone: transaction.quantity >= 3 ? "alert" as const : "default" as const,
    })),
    ...generatedAlerts.map((alert) => ({
      id: `alert-${alert.id}`,
      createdAt: alert.createdAt,
      title: `${friendlySeverity(alert.severity)} alert generated`,
      detail: alertTypeLabel(alert.alertType),
      href: `/dashboard/notifications/${alert.id}`,
      highlighted: highlightedAlertId === alert.id,
      icon: ShieldAlert,
      tone: "alert" as const,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 30);
  const timelineGroups = groupTimeline(timeline);
  const activeTab = resolveCustomerTab(qs.tab);
  const tabs = [
    ["overview", "Overview"],
    ["activity", "Activity"],
    ["rewards", "Rewards"],
    ["referrals", "Referrals"],
    ["programs", "Programs"],
  ] as const;

  return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Customer 360">
      {qs.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}

      <section className="sticky top-0 z-30 -mx-4 border-y border-[#E5E7EB] bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md business-bg-soft business-text">
              <UserRound className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-[#111827] sm:text-2xl">{customerName}</h2>
                <span className="rounded-md bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-700">
                  {customerTier.badgeIcon} {customerTier.badgeLabel}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#6B7280]">
                <StatusBadge status={membership.status} />
                <span>{formatUaePhoneDisplay(customer.normalizedPhone)}</span>
                <span className="hidden text-[#CBD5E1] sm:inline">•</span>
                <span>Joined {formatDate(membership.joinedAt)}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${membership.marketingConsent ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"}`}>
                  {membership.marketingConsent ? "Marketing consent" : "No marketing consent"}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
            <a href={cardUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-md business-button px-3 text-sm font-semibold text-white">
              Open Card
            </a>
            <CopyButton value={cardUrl} label="Copy Card Link" copiedLabel="Card link copied." />
            <div className="col-span-2 sm:col-span-1">
              <CardShareActions
                cardUrl={cardUrl}
                businessName={membership.business.name}
                customerName={customerName}
                recipientPhone={customer.normalizedPhone}
                auditMembershipUuid={membership.uuid}
                whatsappLabel="Share Card"
                showCopy={false}
                showWallet={false}
              />
            </div>
            <Link href={`/dashboard/programs?customer=${membership.uuid}`} className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827]">Enroll Program</Link>
            <Link href="/dashboard/scanner" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827]">Issue Stamp</Link>
            <Link href="/dashboard/scanner" className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827]">Redeem Reward</Link>
            <Link href={`/dashboard/customers/${membership.uuid}/edit`} className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827]">Edit</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Crown} label="Current Tier" value={`${customerTier.badgeIcon} ${customerTier.badgeLabel}`} />
        <KpiCard icon={Users} label="Active Programs" value={activePrograms.toString()} />
        <KpiCard icon={History} label="Total Visits" value={stampTransactions.length.toString()} />
        <KpiCard icon={Gift} label="Available Rewards" value={rewardsReady.toString()} tone={rewardsReady > 0 ? "alert" : "default"} />
      </section>

      <LoyaltyOverviewPanel programCards={programCards} />

      <nav className="-mx-4 border-y border-[#E5E7EB] bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Customer profile tabs">
        <div className="flex gap-2 overflow-x-auto text-sm">
          {tabs.map(([tab, label]) => (
            <TabLink key={tab} href={`/dashboard/customers/${membership.uuid}?tab=${tab}`} label={label} active={activeTab === tab} />
          ))}
        </div>
      </nav>

      {activeTab === "overview" ? (
        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-5">
            <CustomerCardPanel
              cardUrl={cardUrl}
              businessName={membership.business.name}
              customerName={customerName}
              customerPhone={customer.normalizedPhone}
              cardToken={membership.cardToken}
              cardStatus={membership.cardStatus}
              cardCreatedAt={membership.cardCreatedAt}
              cardLastViewedAt={membership.cardLastViewedAt}
              membershipUuid={membership.uuid}
              nextCardStatus={nextCardStatus}
              compact
            />
            <ProfileSummaryCard membership={membership} customer={customer} />
          </div>
          <div className="grid gap-5">
            <TierDetailsPanel customerTier={customerTier} rewardRedemptionsCount={rewardRedemptions.length} totalBonusStamps={totalBonusStamps} activePrograms={activePrograms} joinedAt={membership.joinedAt} />
            <LatestActivityPreview items={timeline.slice(0, 5)} customerUuid={membership.uuid} />
            <ReferralSummaryPanel membershipUuid={membership.uuid} referralCode={membership.referralCode} compact />
          </div>
        </section>
      ) : null}

      {activeTab === "programs" ? (
        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <CustomerCardPanel
            cardUrl={cardUrl}
            businessName={membership.business.name}
            customerName={customerName}
            customerPhone={customer.normalizedPhone}
            cardToken={membership.cardToken}
            cardStatus={membership.cardStatus}
            cardCreatedAt={membership.cardCreatedAt}
            cardLastViewedAt={membership.cardLastViewedAt}
            membershipUuid={membership.uuid}
            nextCardStatus={nextCardStatus}
          />
          <LoyaltyProgramsPanel programCards={programCards} />
        </section>
      ) : null}

      {activeTab === "activity" ? (
      <>
      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold business-text">Activity timeline</p>
            <h2 className="mt-1 text-xl font-semibold text-[#111827]">Customer history</h2>
          </div>
          <History className="h-5 w-5 business-text" aria-hidden="true" />
        </div>
        <div className="mt-5 grid gap-6">
          {timelineGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{group.label}</p>
              <div className="mt-3 grid gap-3">
                {group.items.map((item) => (
                  <TimelineRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
          {timelineGroups.length === 0 ? <p className="text-sm text-[#6B7280]">No customer activity yet.</p> : null}
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">Stamp issuance history</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#6B7280]">
                {["Activity", "Quantity", "Staff", "Branch", "Reason", "Date"].map((heading) => (
                  <th key={heading} className="border-b border-[#E5E7EB] px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stampTransactions.map((transaction) => {
                const isSuspicious = transaction.quantity >= 3;
                const isHighlighted = highlightedTransactionId === transaction.id;
                return (
                  <tr key={transaction.id} className={isHighlighted ? "business-bg-soft" : isSuspicious ? "bg-orange-50" : ""}>
                    <AuditCell highlighted={isHighlighted || isSuspicious}>
                      <Link href={activityHref(transaction.id, highlightedAlertId ?? undefined) ?? "#"} className="font-semibold business-text">
                        #{transaction.id}
                      </Link>
                      {isSuspicious ? <p className="mt-1 text-xs font-semibold text-orange-700">Suspicious quantity</p> : null}
                    </AuditCell>
                    <AuditCell highlighted={isHighlighted || isSuspicious}>{transaction.quantity}</AuditCell>
                    <AuditCell highlighted={isHighlighted || isSuspicious}>
                      <Link href={staffProfileHref(transaction.issuedByUserId, highlightedAlertId ?? undefined, transaction.id) ?? "#"} className="font-semibold business-text">
                        {transaction.issuedByUser.name}
                      </Link>
                    </AuditCell>
                    <AuditCell highlighted={isHighlighted || isSuspicious}>{transaction.branch?.name ?? "-"}</AuditCell>
                    <AuditCell highlighted={isHighlighted || isSuspicious}>{transaction.reason ?? "-"}</AuditCell>
                    <AuditCell highlighted={isHighlighted || isSuspicious}>{formatDateTime(transaction.createdAt)}</AuditCell>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {stampTransactions.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">No stamp issuance history yet.</p> : null}
        </div>
      </section>
      </>
      ) : null}

      {activeTab === "rewards" ? (
        <RewardsPanel programCards={programCards} rewardRedemptions={rewardRedemptions} />
      ) : null}

      {activeTab === "referrals" ? (
        <ReferralSummaryPanel membershipUuid={membership.uuid} referralCode={membership.referralCode} />
      ) : null}
    </DashboardShell>
  );
}

function KpiCard({ icon: Icon, label, value, tone = "default" }: { icon: LucideIcon; label: string; value: string; tone?: "default" | "alert" }) {
  return (
    <div className={`rounded-md border p-4 shadow-sm ${tone === "alert" ? "business-border-soft business-bg-soft" : "border-[#E5E7EB] bg-white"}`}>
      <Icon className={`h-5 w-5 ${tone === "alert" ? "business-text-strong" : "business-text"}`} aria-hidden="true" />
      <p className="mt-3 text-sm text-[#6B7280]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-md border px-3 py-2 font-semibold transition ${
        active ? "business-border business-bg-soft business-text" : "border-[#E5E7EB] text-[#111827] business-hover"
      }`}
    >
      {label}
    </Link>
  );
}

function ProfileSummaryCard({
  membership,
  customer,
}: {
  membership: Awaited<ReturnType<typeof getBusinessCustomerOrRedirect>>;
  customer: Awaited<ReturnType<typeof getBusinessCustomerOrRedirect>>["globalCustomer"];
}) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold business-text">Profile summary</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Member details</h2>
        </div>
        <UserRound className="h-5 w-5 business-text" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Info label="Email" value={customer.email ?? "-"} />
        <Info label="Customer since" value={formatDate(membership.joinedAt)} />
        <Info label="Card issued branch" value={membership.createdBranch?.name ?? "-"} />
        <Info label="Card issued by" value={membership.createdByUser?.name ?? "-"} />
      </div>
    </section>
  );
}

function LoyaltyOverviewPanel({
  programCards,
}: {
  programCards: Array<{
    programMembership: Awaited<ReturnType<typeof getBusinessCustomerOrRedirect>>["programMemberships"][number];
    scanUrl: string;
    qrCode: string;
    nextScanStatus: string;
    membershipUuid: string;
  }>;
}) {
  const visiblePrograms = programCards.slice(0, 3);
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold business-text">Active loyalty progress</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Programs</h2>
        </div>
        <Link href="?tab=programs" className="text-sm font-semibold business-text">View programs</Link>
      </div>
      <div className="mt-5 grid gap-3">
        {visiblePrograms.map(({ programMembership }) => {
          const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
          const required = programMembership.loyaltyProgram.requiredStamps;
          const progressPercent = Math.min(100, Math.round((progress / required) * 100));
          const isRewardReady = progress >= required && programMembership.status !== "COMPLETED";
          return (
            <article key={programMembership.id} className="rounded-md border border-[#E5E7EB] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#111827]">{programMembership.loyaltyProgram.name}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">Reward: {programMembership.loyaltyProgram.rewardName}</p>
                </div>
                {isRewardReady ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Reward Ready</span> : null}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#111827]">{progress} / {required}</span>
                <span className="text-[#6B7280]">{progressPercent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full business-secondary-bg-soft">
                <div className="h-full rounded-full business-button" style={{ width: `${progressPercent}%` }} />
              </div>
            </article>
          );
        })}
        {programCards.length === 0 ? <p className="text-sm text-[#6B7280]">No program enrollments yet.</p> : null}
      </div>
    </section>
  );
}

function LatestActivityPreview({ items, customerUuid }: { items: TimelineItem[]; customerUuid: string }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold business-text">Latest activity</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Recent movement</h2>
        </div>
        <Link href={`/dashboard/customers/${customerUuid}?tab=activity`} className="text-sm font-semibold business-text">View all</Link>
      </div>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <TimelineRow key={item.id} item={item} compact />
        ))}
        {items.length === 0 ? <p className="text-sm text-[#6B7280]">No activity yet.</p> : null}
      </div>
    </section>
  );
}

function TierDetailsPanel({
  customerTier,
  rewardRedemptionsCount,
  totalBonusStamps,
  activePrograms,
  joinedAt,
}: {
  customerTier: ReturnType<typeof calculateCustomerTier>;
  rewardRedemptionsCount: number;
  totalBonusStamps: number;
  activePrograms: number;
  joinedAt: Date;
}) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold business-text">Tier details</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Customer grade</h2>
        </div>
        <Sparkles className="h-5 w-5 business-text" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InsightMetric icon={Crown} label="Current tier" value={`${customerTier.badgeIcon} ${customerTier.badgeLabel}`} />
        <InsightMetric icon={History} label="Visits completed" value={customerTier.qualifyingVisits.toString()} />
        <InsightMetric icon={Sparkles} label="Next tier" value={customerTier.nextTier ?? "Top tier"} />
        <InsightMetric icon={Gift} label="Rewards redeemed" value={rewardRedemptionsCount.toString()} />
        <InsightMetric icon={Gift} label="Bonus stamps" value={totalBonusStamps.toString()} />
        <InsightMetric icon={Users} label="Active programs" value={activePrograms.toString()} />
        <InsightMetric icon={CalendarDays} label="Customer since" value={formatDate(joinedAt)} />
      </div>
      <div className={`mt-4 rounded-md border p-4 ${customerTier.isVip ? "border-yellow-300 bg-[#111827] text-white" : "border-[#E5E7EB] bg-[#FAFAFA] text-[#111827]"}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`text-sm font-semibold ${customerTier.isVip ? "text-yellow-200" : "business-text"}`}>Tier progress</p>
            <p className="mt-1 text-sm">
              {customerTier.nextTier
                ? `${customerTier.visitsRemaining} visit${customerTier.visitsRemaining === 1 ? "" : "s"} remaining to ${customerTier.nextTier}`
                : "Top Tier Member with exclusive rewards available"}
            </p>
          </div>
          <p className="text-lg font-semibold">{customerTier.progressPercent}%</p>
        </div>
        <div className={`mt-3 h-2 overflow-hidden rounded-full ${customerTier.isVip ? "bg-white/15" : "business-secondary-bg-soft"}`}>
          <div className={`h-full rounded-full ${customerTier.isVip ? "bg-yellow-300" : "business-button"}`} style={{ width: `${customerTier.progressPercent}%` }} />
        </div>
      </div>
    </section>
  );
}

function ReferralSummaryPanel({ membershipUuid, referralCode, compact = false }: { membershipUuid: string; referralCode: string | null; compact?: boolean }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold business-text">Referrals</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Referral investigation</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Referral performance is managed in the Referral Center. Use the referral code to filter this customer's referral activity.
          </p>
        </div>
        <Link href={`/dashboard/referrals?search=${encodeURIComponent(referralCode ?? membershipUuid)}`} className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
          Open Referral Center
        </Link>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Info label="Referral code" value={referralCode ?? "-"} />
        {!compact ? <Info label="Customer profile" value={membershipUuid} /> : null}
      </div>
    </section>
  );
}

function RewardsPanel({
  programCards,
  rewardRedemptions,
}: {
  programCards: Array<{
    programMembership: Awaited<ReturnType<typeof getBusinessCustomerOrRedirect>>["programMemberships"][number];
    scanUrl: string;
    qrCode: string;
    nextScanStatus: string;
    membershipUuid: string;
  }>;
  rewardRedemptions: Array<{
    id: number;
    rewardName: string;
    redeemedAt: Date;
    branch: { name: string } | null;
    redeemedByUser: { name: string };
    loyaltyProgram: { name: string };
  }>;
}) {
  const availableRewards = programCards.filter(({ programMembership }) => {
    const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
    return progress >= programMembership.loyaltyProgram.requiredStamps && programMembership.status !== "COMPLETED";
  });

  return (
    <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold business-text">Available rewards</p>
        <h2 className="mt-1 text-xl font-semibold text-[#111827]">Ready to redeem</h2>
        <div className="mt-5 grid gap-3">
          {availableRewards.map(({ programMembership }) => (
            <article key={programMembership.id} className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-900">{programMembership.loyaltyProgram.rewardName}</p>
              <p className="mt-1 text-sm text-emerald-800">{programMembership.loyaltyProgram.name}</p>
              <Link href="/dashboard/scanner" className="mt-3 inline-flex rounded-md business-button px-3 py-2 text-sm font-semibold text-white">
                Redeem Reward
              </Link>
            </article>
          ))}
          {availableRewards.length === 0 ? <p className="text-sm text-[#6B7280]">No rewards are currently available.</p> : null}
        </div>
      </div>

      <div className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold business-text">Reward history</p>
        <h2 className="mt-1 text-xl font-semibold text-[#111827]">Redeemed rewards</h2>
        <div className="mt-5 grid gap-3">
          {rewardRedemptions.map((redemption) => (
            <article key={redemption.id} className="rounded-md border border-[#E5E7EB] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-[#111827]">{redemption.rewardName}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{redemption.loyaltyProgram.name}</p>
                </div>
                <div className="text-sm text-[#6B7280] md:text-right">
                  <p>{formatDateTime(redemption.redeemedAt)}</p>
                  <p>{redemption.branch?.name ?? "No branch"} by {redemption.redeemedByUser.name}</p>
                </div>
              </div>
            </article>
          ))}
          {rewardRedemptions.length === 0 ? <p className="text-sm text-[#6B7280]">No reward redemptions yet.</p> : null}
        </div>
      </div>
    </section>
  );
}

function CustomerCardPanel({
  cardUrl,
  businessName,
  customerName,
  customerPhone,
  cardToken,
  cardStatus,
  cardCreatedAt,
  cardLastViewedAt,
  membershipUuid,
  nextCardStatus,
  compact = false,
}: {
  cardUrl: string;
  businessName: string;
  customerName: string;
  customerPhone: string;
  cardToken: string;
  cardStatus: string;
  cardCreatedAt: Date;
  cardLastViewedAt: Date | null;
  membershipUuid: string;
  nextCardStatus: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold business-text">Customer card</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Public member card</h2>
          {!compact ? <p className="mt-2 text-sm text-[#6B7280]">Card number: {getShortCardToken(cardToken)}</p> : null}
        </div>
        <CreditCard className="h-5 w-5 business-text" aria-hidden="true" />
      </div>
      {!compact ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Info label="Card status" value={cardStatus.toLowerCase()} />
            <Info label="Created" value={formatDate(cardCreatedAt)} />
            <Info label="Last viewed" value={cardLastViewedAt ? formatDate(cardLastViewedAt) : "-"} />
          </div>
          <p className="mt-4 break-all rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-xs text-[#6B7280]">{cardUrl}</p>
        </>
      ) : (
        <p className="mt-4 rounded-md border business-border-soft business-bg-soft px-3 py-2 text-sm business-text-strong">
          Use this secure public card link for customer visits, stamps, rewards, and QR scans.
        </p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <a href={cardUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
          Open public card
        </a>
        {compact ? (
          <Link href={`/dashboard/customers/${membershipUuid}?tab=programs`} className="inline-flex items-center justify-center rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
            Card tools
          </Link>
        ) : (
          <form action={toggleCustomerCardAction}>
            <CsrfInput scope="dashboard:customers" />
            <input type="hidden" name="membershipUuid" value={membershipUuid} />
            <input type="hidden" name="nextStatus" value={nextCardStatus} />
            <button type="submit" className="w-full rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
              {nextCardStatus === "ACTIVE" ? "Enable card" : "Disable card"}
            </button>
          </form>
        )}
      </div>
      {!compact ? <div className="mt-4">
        <CardShareActions
          cardUrl={cardUrl}
          businessName={businessName}
          customerName={customerName}
          recipientPhone={customerPhone}
          auditMembershipUuid={membershipUuid}
          showWallet={false}
        />
      </div> : null}
    </section>
  );
}

function LoyaltyProgramsPanel({
  programCards,
}: {
  programCards: Array<{
    programMembership: Awaited<ReturnType<typeof getBusinessCustomerOrRedirect>>["programMemberships"][number];
    scanUrl: string;
    qrCode: string;
    nextScanStatus: string;
    membershipUuid: string;
  }>;
}) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold business-text">Loyalty programs</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Program progress</h2>
        </div>
        <Gift className="h-5 w-5 business-text" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-4">
        {programCards.map(({ programMembership, scanUrl, qrCode, nextScanStatus, membershipUuid }) => {
          const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
          const required = programMembership.loyaltyProgram.requiredStamps;
          const progressPercent = Math.min(100, Math.round((progress / required) * 100));
          const remaining = Math.max(0, required - progress);
          const isRewardReady = progress >= required && programMembership.status !== "COMPLETED";
          return (
            <article key={programMembership.id} className="rounded-md border border-[#E5E7EB] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#111827]">{programMembership.loyaltyProgram.name}</h3>
                    {isRewardReady ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Reward Ready</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-[#6B7280]">Reward: {programMembership.loyaltyProgram.rewardName}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#111827]">{progress} / {required}</span>
                      <span className="text-[#6B7280]">{progressPercent}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full business-secondary-bg-soft">
                      <div className="h-2 rounded-full business-button" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-[#6B7280]">
                      {isRewardReady ? "Reward Ready" : `${remaining} stamp${remaining === 1 ? "" : "s"} remaining until reward`}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-[#6B7280]">
                    Status: {programCustomerStatusLabel({
                      status: programMembership.status,
                      earnedStamps: programMembership.earnedStamps,
                      bonusStamps: programMembership.bonusStamps,
                      requiredStamps: required,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-center rounded-md border border-[#E5E7EB] bg-white p-3">
                  <Image src={qrCode} alt={`${programMembership.loyaltyProgram.name} scan QR`} width={112} height={112} unoptimized />
                  <p className="mt-2 text-center text-xs font-medium text-[#6B7280]">Scan QR</p>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-3">
                <p className="text-sm font-semibold text-[#111827]">Scan token status: {scanStatusLabel(programMembership.scanStatus)}</p>
                <p className="mt-2 break-all text-xs text-[#6B7280]">{scanUrl}</p>
                <div className="mt-4 flex flex-wrap items-start gap-3">
                  <CopyButton value={scanUrl} label="Copy scan URL" copiedLabel="Scan URL copied." />
                  <a href={scanUrl} target="_blank" rel="noreferrer" className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
                    Open scan URL
                  </a>
                  <form action={toggleProgramScanTokenAction}>
                    <CsrfInput scope="dashboard:customers" />
                    <input type="hidden" name="membershipUuid" value={membershipUuid} />
                    <input type="hidden" name="programMembershipUuid" value={programMembership.uuid} />
                    <input type="hidden" name="nextStatus" value={nextScanStatus} />
                    <button type="submit" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
                      {nextScanStatus === "ACTIVE" ? "Enable scan token" : "Disable scan token"}
                    </button>
                  </form>
                </div>
              </div>
            </article>
          );
        })}
        {programCards.length === 0 ? <p className="text-sm text-[#6B7280]">No program enrollments yet.</p> : null}
      </div>
    </section>
  );
}

function TimelineRow({ item, compact = false }: { item: TimelineItem; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <div className={`rounded-md border ${compact ? "p-3" : "p-4"} ${item.highlighted ? "business-border business-bg-soft" : "border-[#E5E7EB] bg-white"}`}>
      <div className="flex gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${item.tone === "alert" ? "bg-red-50 text-red-600" : item.tone === "success" ? "bg-emerald-50 text-emerald-700" : "business-bg-soft business-text"}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
            <div>
              {item.href ? (
                <Link href={item.href} className="font-semibold text-[#111827] transition business-hover business-text">
                  {item.title}
                </Link>
              ) : (
                <p className="font-semibold text-[#111827]">{item.title}</p>
              )}
              <p className="mt-1 text-sm text-[#6B7280]">{item.detail}</p>
            </div>
            <p className="shrink-0 text-sm text-[#6B7280]">{formatDateTime(item.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskMetric({ label, value, tone }: { label: string; value: number; tone: "high" | "medium" | "low" }) {
  const toneClass = tone === "high" ? "text-red-700 bg-red-50" : tone === "medium" ? "text-orange-700 bg-orange-50" : "text-emerald-700 bg-emerald-50";
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function InsightMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-4">
      <Icon className="h-4 w-4 business-text" aria-hidden="true" />
      <p className="mt-3 text-sm text-[#6B7280]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const classes =
    severity === "HIGH"
      ? "bg-red-50 text-red-700"
      : severity === "MEDIUM"
        ? "bg-orange-50 text-orange-700"
        : "bg-emerald-50 text-emerald-700";
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${classes}`}>{friendlySeverity(severity)}</span>;
}

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{status.toLowerCase()}</span>;
}

function AuditCell({ children, highlighted }: { children: React.ReactNode; highlighted: boolean }) {
  return (
    <td className={`border-b px-3 py-4 text-[#6B7280] ${highlighted ? "business-border" : "border-[#E5E7EB]"}`}>
      {children}
    </td>
  );
}

function Info({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-[#E5E7EB] bg-white p-4 ${wide ? "md:col-span-4" : ""}`}>
      <p className="text-sm text-[#6B7280]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}

function friendlySeverity(severity: string) {
  return severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
}

function groupTimeline(items: TimelineItem[]) {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(today);
  last7.setDate(last7.getDate() - 7);

  const groups = [
    { label: "Today", items: [] as TimelineItem[] },
    { label: "Yesterday", items: [] as TimelineItem[] },
    { label: "Last 7 Days", items: [] as TimelineItem[] },
    { label: "Older", items: [] as TimelineItem[] },
  ];

  for (const item of items) {
    const date = startOfDay(item.createdAt);
    if (date.getTime() === today.getTime()) groups[0].items.push(item);
    else if (date.getTime() === yesterday.getTime()) groups[1].items.push(item);
    else if (date >= last7) groups[2].items.push(item);
    else groups[3].items.push(item);
  }

  return groups.filter((group) => group.items.length > 0);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function resolveCustomerTab(tab: string | undefined) {
  const allowed = ["overview", "activity", "rewards", "referrals", "programs"];
  return allowed.includes(tab ?? "") ? tab! : "overview";
}
