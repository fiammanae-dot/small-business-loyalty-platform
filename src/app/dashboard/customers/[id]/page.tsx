import Link from "next/link";
import Image from "next/image";
import type React from "react";
import {
  Award,
  CalendarDays,
  Check,
  CreditCard,
  Crown,
  Footprints,
  Gift,
  History,
  MapPin,
  Phone,
  ShieldAlert,
  Sparkles,
  TicketCheck,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { CardShareActions } from "@/components/CardShareActions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CopyButton } from "@/components/CopyButton";
import { CsrfInput } from "@/components/CsrfInput";
import { ActionMenu, ActionMenuItem, Avatar, ButtonLink, MetricCard, PageActions, ProgressBar, SectionCard, StatusBadge, Tabs } from "@/components/ui";
import { getBusinessOwnerContext } from "@/lib/business-owner";
import { activityHref, staffProfileHref } from "@/lib/alert-investigation";
import { alertTypeLabel } from "@/lib/alert-labels";
import { getCardUrl, getShortCardToken } from "@/lib/customer-cards";
import { calculateCustomerTier } from "@/lib/customer-tiers";
import { customerSourceLabels, getBusinessCustomerOrRedirect } from "@/lib/customers";
import { formatDate, formatDateTime } from "@/lib/format";
import { getGoogleWalletStatus } from "@/lib/google-wallet/service";
import { formatUaePhoneDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
import { getScanQrDataUrl, getScanUrl, scanStatusLabel } from "@/lib/scan";
import { manualStampCorrectionAction, toggleCustomerCardAction, toggleProgramScanTokenAction } from "@/app/dashboard/actions";

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
  const cardUrl = await getCardUrl(membership.cardToken);
  const nextCardStatus = membership.cardStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
  const customerName = `${membership.firstName} ${membership.lastName ?? ""}`.trim();
  const cardShareMessageType = qs.success?.includes("Customer created") ? "welcome" : "resend";

  const programCards = await Promise.all(
    membership.programMemberships.map(async (programMembership) => ({
      programMembership,
      scanUrl: await getScanUrl(programMembership.scanToken),
      qrCode: await getScanQrDataUrl(programMembership.scanToken),
      nextScanStatus: programMembership.scanStatus === "ACTIVE" ? "DISABLED" : "ACTIVE",
      googleWalletUrl: `/api/wallet/google/save/${programMembership.scanToken}`,
      googleWalletStatus: await getGoogleWalletStatus(programMembership.id),
      membershipUuid: membership.uuid,
    })),
  );
  const programMembershipIds = membership.programMemberships.map((programMembership) => programMembership.id);

  const [stampTransactions, generatedAlerts, rewardRedemptions, correctionEvents] = await Promise.all([
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
    prisma.auditEvent.findMany({
      where: {
        businessId: user.businessId,
        entityType: "customer_program_membership",
        entityId: { in: programMembershipIds.length ? programMembershipIds.map(String) : ["-1"] },
        action: { in: ["STAMP_UNDONE", "STAMP_MANUAL_CORRECTION"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        actorUser: true,
        branch: true,
      },
    }),
  ]);

  const totalBonusStamps = membership.programMemberships.reduce((sum, programMembership) => sum + programMembership.bonusStamps, 0);
  const totalPrograms = membership.programMemberships.length;
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
    ...correctionEvents.map((event) => {
      const metadata = auditMetadata(event.metadata);
      const reason = typeof metadata.reason === "string" ? metadata.reason : null;
      const programName = typeof metadata.programName === "string" ? metadata.programName : "Customer program";
      const appliedAdjustment = typeof metadata.appliedAdjustment === "number" ? metadata.appliedAdjustment : null;
      const quantity = typeof metadata.quantity === "number" ? metadata.quantity : null;
      const actorName = event.actorUser?.name ?? "Team member";
      return {
        id: `correction-${event.id}`,
        createdAt: event.createdAt,
        title: event.action === "STAMP_UNDONE" ? `Stamp removed / undone by ${actorName}` : `Manual stamp correction by ${actorName}`,
        detail:
          event.action === "STAMP_UNDONE"
            ? `${quantity ?? 1} stamp${quantity === 1 ? "" : "s"} removed from ${programName}${reason ? `: ${reason}` : "."}`
            : `${appliedAdjustment && appliedAdjustment > 0 ? "+" : ""}${appliedAdjustment ?? "Adjusted"} stamp${Math.abs(appliedAdjustment ?? 1) === 1 ? "" : "s"} on ${programName}${reason ? `: ${reason}` : "."}`,
        href: null,
        highlighted: false,
        icon: History,
        tone: "alert" as const,
      };
    }),
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
  const primaryProgram = programCards[0]?.programMembership ?? null;
  const primaryProgress = primaryProgram ? progressValue(primaryProgram.earnedStamps, primaryProgram.bonusStamps) : 0;
  const primaryRequired = primaryProgram?.loyaltyProgram.requiredStamps ?? 0;
  const primaryScanHref = primaryProgram ? `/scan/${primaryProgram.scanToken}` : "/dashboard/scanner";
  const primaryGoogleWalletUrl = primaryProgram ? `/api/wallet/google/save/${primaryProgram.scanToken}` : null;
  const primaryRewardReady = Boolean(
    primaryProgram &&
      primaryProgram.status !== "COMPLETED" &&
      primaryProgress >= primaryProgram.loyaltyProgram.requiredStamps,
  );
  const referralStatus = membership.referralCode ? "ACTIVE" : "NOT_CONFIGURED";
return (
    <DashboardShell user={user} eyebrow="Business Owner" title="Customer 360">
      {qs.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{qs.success}</p> : null}

      <SectionCard className="overflow-hidden bg-white">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative shrink-0">
              <div className={`rounded-full p-[3px] ${customerTier.isVip ? "bg-[#111827]" : "business-bg-soft"}`}>
                <Avatar name={customerName} className="h-16 w-16 border-2 border-white text-xl" />
              </div>
              {customerTier.isVip ? (
                <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full border-2 border-white bg-[#111827] px-1.5 py-0.5 text-[10px] font-bold text-yellow-300">
                  <Crown className="h-3 w-3" aria-hidden /> VIP
                </span>
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-2xl font-semibold text-[#111827]">{customerName}</h2>
                <StatusBadge tone={membership.status === "ACTIVE" ? "success" : "neutral"}>{membership.status.toLowerCase()}</StatusBadge>
                <StatusBadge tone="business">{customerTier.badgeIcon} {customerTier.badgeLabel}</StatusBadge>
                {primaryRewardReady ? <StatusBadge tone="warning">Reward ready</StatusBadge> : null}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[#6B7280]">
                <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-[#94A3B8]" aria-hidden />{formatUaePhoneDisplay(membership.normalizedPhone)}</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-[#94A3B8]" aria-hidden />Member since {formatDate(membership.joinedAt)}</span>
                {membership.createdBranch?.name ? (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#94A3B8]" aria-hidden />{membership.createdBranch.name}</span>
                ) : null}
              </div>
            </div>
          </div>
          <PageActions className="xl:justify-end">
            {primaryRewardReady ? (
              <ButtonLink href={primaryScanHref} variant="success" size="sm" leftIcon={<Gift className="h-4 w-4" aria-hidden />}>
                Redeem Reward
              </ButtonLink>
            ) : (
              <ButtonLink href={primaryScanHref} variant="business" size="sm" leftIcon={<TicketCheck className="h-4 w-4" aria-hidden />}>
                Issue Stamp
              </ButtonLink>
            )}
            <ButtonLink href={cardUrl} target="_blank" rel="noreferrer" variant="outline" size="sm" leftIcon={<CreditCard className="h-4 w-4" aria-hidden />}>
              Open Card
            </ButtonLink>
            <ActionMenu label="More actions">
              <ActionMenuItem>
                <Link href={"/dashboard/programs?customer=" + membership.uuid} className="block rounded-md px-2 py-2 font-semibold hover:bg-[#F8FAFC]">
                  Enroll Program
                </Link>
              </ActionMenuItem>
              <ActionMenuItem>
                <Link href={"/dashboard/customers/" + membership.uuid + "/edit"} className="block rounded-md px-2 py-2 font-semibold hover:bg-[#F8FAFC]">
                  Edit Customer
                </Link>
              </ActionMenuItem>
              <ActionMenuItem>
                <Link href={"/dashboard/referrals?search=" + encodeURIComponent(membership.referralCode ?? getShortCardToken(membership.cardToken))} className="block rounded-md px-2 py-2 font-semibold hover:bg-[#F8FAFC]">
                  Open Referral Center
                </Link>
              </ActionMenuItem>
              <ActionMenuItem>
                <Link href="/dashboard/scanner" className="block rounded-md px-2 py-2 font-semibold hover:bg-[#F8FAFC]">
                  Open Scanner
                </Link>
              </ActionMenuItem>
              <ActionMenuItem>
                <CopyButton value={cardUrl} label="Copy Card Link" copiedLabel="Card link copied." />
              </ActionMenuItem>
              <ActionMenuItem>
                <CardShareActions
                  cardUrl={cardUrl}
                  businessName={membership.business.name}
                  customerName={customerName}
                  recipientPhone={membership.normalizedPhone}
                  auditMembershipUuid={membership.uuid}
                  whatsappLabel="Share Card"
                  messageType={cardShareMessageType}
                  showCopy={false}
                  showWallet={false}
                  compact
                />
              </ActionMenuItem>
            </ActionMenu>
          </PageActions>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Lifetime visits"
            value={customerTier.qualifyingVisits}
            helper="Qualifying visits recorded"
            icon={<Footprints aria-hidden />}
          />
          <MetricCard
            label="Active programs"
            value={activePrograms}
            helper={`of ${totalPrograms} enrolled`}
            icon={<CreditCard aria-hidden />}
          />
          <MetricCard
            label="Rewards ready"
            value={rewardsReady}
            helper={rewardsReady > 0 ? "Ready to redeem now" : "None ready yet"}
            icon={<Gift aria-hidden />}
            tone={rewardsReady > 0 ? "warning" : "neutral"}
          />
          <MetricCard
            label="Rewards redeemed"
            value={rewardRedemptions.length}
            helper="Lifetime total"
            icon={<Award aria-hidden />}
          />
        </div>
      </SectionCard>

      <Tabs
        label="Customer sections"
        defaultValue={resolveCustomerTab(qs.tab)}
        items={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]">
                <div className="grid min-w-0 gap-5">
                  <LoyaltyOverviewPanel programCards={programCards} />
                  <LatestActivityPreview items={timeline.slice(0, 6)} />
                </div>
                <div className="grid min-w-0 gap-5">
                  <ProfileSummaryCard membership={membership} />
                  <TierDetailsPanel customerTier={customerTier} rewardRedemptionsCount={rewardRedemptions.length} totalBonusStamps={totalBonusStamps} activePrograms={activePrograms} joinedAt={membership.joinedAt} />
                </div>
              </div>
            ),
          },
          {
            id: "activity",
            label: "Activity",
            content: <ActivityTabContent items={timeline} />,
          },
          {
            id: "rewards",
            label: "Rewards",
            content: <RewardsPanel programCards={programCards} rewardRedemptions={rewardRedemptions} />,
          },
          {
            id: "referrals",
            label: "Referrals",
            content: (
              <ReferralSummaryPanel memberReference={membership.referralCode ?? getShortCardToken(membership.cardToken)} referralCode={membership.referralCode} />
            ),
          },
          {
            id: "card",
            label: "Card & QR",
            content: (
              <div className="grid min-w-0 gap-5 xl:grid-cols-2">
                <CustomerCardPanel
                  cardUrl={cardUrl}
                  businessName={membership.business.name}
                  customerName={customerName}
                  customerPhone={membership.normalizedPhone}
                  cardToken={membership.cardToken}
                  cardStatus={membership.cardStatus}
                  cardCreatedAt={membership.cardCreatedAt}
                  cardLastViewedAt={membership.cardLastViewedAt}
                  membershipUuid={membership.uuid}
                  nextCardStatus={nextCardStatus}
                  messageType={cardShareMessageType}
                  googleWalletUrl={primaryGoogleWalletUrl}
                />
                <ProgramQrPanel programCards={programCards} />
              </div>
            ),
          },
        ]}
      />
    </DashboardShell>
  );
}

const STAMP_GRID_CAP = 24;

function StampGrid({ progress, required }: { progress: number; required: number }) {
  const filled = Math.min(Math.max(progress, 0), required);
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: required }).map((_, index) => {
        if (index < filled) {
          return (
            <span key={index} className="flex h-7 w-7 items-center justify-center rounded-full business-button text-white">
              <Check className="h-3.5 w-3.5" aria-hidden />
            </span>
          );
        }
        if (index === filled) {
          return (
            <span key={index} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed business-border text-[11px] font-bold business-text">
              {index + 1}
            </span>
          );
        }
        return <span key={index} className="h-7 w-7 rounded-full border border-[#E5E7EB] bg-[#FAFAFA]" />;
      })}
    </div>
  );
}

function ConnectedTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="grid">
      {items.map((item, index) => (
        <ConnectedTimelineRow key={item.id} item={item} isLast={index === items.length - 1} />
      ))}
    </div>
  );
}

function ConnectedTimelineRow({ item, isLast }: { item: TimelineItem; isLast: boolean }) {
  const Icon = item.icon;
  const dotTone =
    item.tone === "alert"
      ? "bg-red-50 text-red-600"
      : item.tone === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "business-bg-soft business-text";
  return (
    <div className="flex gap-3">
      <div className="relative flex w-6 shrink-0 justify-center">
        <span className={`z-10 flex h-6 w-6 items-center justify-center rounded-full ${dotTone}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {!isLast ? <span className="absolute left-1/2 top-6 -bottom-1 w-0.5 -translate-x-1/2 bg-[#EEF1F4]" /> : null}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-5"}`}>
        <div className={`rounded-md px-3 py-2 ${item.highlighted ? "business-border business-bg-soft border" : ""}`}>
          {item.href ? (
            <Link href={item.href} className="text-sm font-semibold text-[#111827] transition business-hover business-text">
              {item.title}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
          )}
          <p className="mt-0.5 text-xs text-[#6B7280]">{item.detail}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">{formatDateTime(item.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

function ProfileSummaryCard({
  membership,
}: {
  membership: Awaited<ReturnType<typeof getBusinessCustomerOrRedirect>>;
}) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Email", value: membership.email ?? "-" },
    { label: "Customer since", value: formatDate(membership.joinedAt) },
    { label: "Card issued branch", value: membership.createdBranch?.name ?? "-" },
    { label: "Card issued by", value: membership.createdByUser?.name ?? "-" },
  ];
  return (
    <section className="rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold tracking-tight text-[#171A21]">Profile</h2>
        <UserRound className="h-5 w-5 business-text" aria-hidden="true" />
      </div>
      <dl className="mt-4 grid gap-0">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`flex items-center justify-between gap-4 py-2.5 text-sm ${index === 0 ? "" : "border-t border-[#F1F3F5]"}`}
          >
            <dt className="text-[#6B7280]">{row.label}</dt>
            <dd className="min-w-0 truncate text-right font-semibold text-[#111827]">{row.value}</dd>
          </div>
        ))}
      </dl>
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
    googleWalletUrl: string;
    googleWalletStatus: Awaited<ReturnType<typeof getGoogleWalletStatus>>;
    membershipUuid: string;
  }>;
}) {
  return (
    <section className="rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[#171A21]">Loyalty progress</h2>
          <p className="mt-0.5 text-[13px] text-[#7A8091]">{programCards.length} program{programCards.length === 1 ? "" : "s"} enrolled</p>
        </div>
        <Link href="/dashboard/programs" className="text-sm font-semibold business-text">View programs</Link>
      </div>
      <div className="mt-5 grid gap-4">
        {programCards.map(({ programMembership, membershipUuid }) => {
          const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
          const required = programMembership.loyaltyProgram.requiredStamps;
          const progressPercent = required <= 0 ? 0 : Math.min(100, Math.round((progress / required) * 100));
          const remaining = Math.max(0, required - progress);
          const isRewardReady = progress >= required && programMembership.status !== "COMPLETED";
          const showGrid = required > 0 && required <= STAMP_GRID_CAP;
          return (
            <article key={programMembership.id} className={`rounded-xl border p-4 md:p-5 ${isRewardReady ? "border-[#F3D9A4] bg-[#FFFBF2]" : "border-[#E7E9EE] bg-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[#111827]">{programMembership.loyaltyProgram.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#6B7280]"><Gift className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden />{programMembership.loyaltyProgram.rewardName}</p>
                </div>
                {isRewardReady ? <StatusBadge tone="warning">Reward ready</StatusBadge> : null}
              </div>
              {showGrid ? (
                <div className="mt-4">
                  <StampGrid progress={progress} required={required} />
                </div>
              ) : null}
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[#111827]">{progress} <span className="text-base font-medium text-[#6B7280]">/ {required} stamps</span></span>
                <span className={`text-sm font-semibold ${isRewardReady ? "text-emerald-600" : "business-text"}`}>{isRewardReady ? "Ready to redeem" : `${progressPercent}%`}</span>
              </div>
              <ProgressBar value={progress} max={required} className="mt-3" />
              {!isRewardReady ? (
                <p className="mt-2 text-sm text-[#6B7280]">{remaining} stamp{remaining === 1 ? "" : "s"} remaining until reward</p>
              ) : null}
              <ManualStampCorrectionForm membershipUuid={membershipUuid} programMembershipUuid={programMembership.uuid} />
            </article>
          );
        })}
        {programCards.length === 0 ? <p className="text-sm text-[#6B7280]">No program enrollments yet.</p> : null}
      </div>
    </section>
  );
}

function ManualStampCorrectionForm({
  membershipUuid,
  programMembershipUuid,
}: {
  membershipUuid: string;
  programMembershipUuid: string;
}) {
  return (
    <details className="mt-4 rounded-md border border-[#E5E7EB] [&_summary::-webkit-details-marker]:hidden">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-[#6B7280] hover:text-[#111827]">
        Manual correction
      </summary>
      <form action={manualStampCorrectionAction} className="border-t border-orange-200 bg-orange-50 p-3">
        <CsrfInput scope="dashboard:stamp-correction" />
        <input type="hidden" name="membershipUuid" value={membershipUuid} />
        <input type="hidden" name="programMembershipUuid" value={programMembershipUuid} />
        <p className="text-xs leading-5 text-orange-800">Business Owner only. This adjusts progress and records the reason in audit history.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-orange-900">
            Stamps
            <select name="adjustment" required className="min-h-10 rounded-md border border-orange-200 bg-white px-3 text-sm font-semibold text-[#111827]">
              <option value="">Select</option>
              <option value="-1">-1</option>
              <option value="-2">-2</option>
              <option value="-3">-3</option>
              <option value="1">+1</option>
              <option value="2">+2</option>
              <option value="3">+3</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-orange-900">
            Reason
            <input name="correctionReason" required minLength={5} maxLength={500} placeholder="Required correction reason" className="min-h-10 rounded-md border border-orange-200 bg-white px-3 text-sm font-semibold text-[#111827]" />
          </label>
          <ConfirmSubmitButton
            title="Record manual correction?"
            message="This will adjust customer stamp progress and permanently record the correction in audit history."
            confirmLabel="Record Correction"
            cancelLabel="Cancel"
            className="min-h-10 rounded-md border border-orange-300 bg-white px-4 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
          >
            Record
          </ConfirmSubmitButton>
        </div>
      </form>
    </details>
  );
}

function LatestActivityPreview({ items }: { items: TimelineItem[] }) {
  return (
    <section className="rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold tracking-tight text-[#171A21]">Recent activity</h2>
        <Link href="?tab=activity" className="text-sm font-semibold business-text">View all</Link>
      </div>
      <div className="mt-4">
        {items.length > 0 ? <ConnectedTimeline items={items} /> : <p className="text-sm text-[#6B7280]">No activity yet.</p>}
      </div>
    </section>
  );
}

function ActivityTabContent({ items }: { items: TimelineItem[] }) {
  const groups = groupTimeline(items);
  return (
    <section className="rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <h2 className="text-base font-bold tracking-tight text-[#171A21]">All activity</h2>
      <div className="mt-5 grid gap-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">{group.label}</p>
            <ConnectedTimeline items={group.items} />
          </div>
        ))}
        {groups.length === 0 ? <p className="text-sm text-[#6B7280]">No activity yet.</p> : null}
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
  compact = false,
}: {
  customerTier: ReturnType<typeof calculateCustomerTier>;
  rewardRedemptionsCount: number;
  totalBonusStamps: number;
  activePrograms: number;
  joinedAt: Date;
  compact?: boolean;
}) {
  return (
    <section className="rounded-xl border border-[#E7E9EE] bg-white p-4 shadow-[0_1px_2px_rgba(15,18,25,0.04)] md:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold tracking-tight text-[#171A21]">Tier status</h2>
        <Sparkles className="h-5 w-5 business-text" aria-hidden="true" />
      </div>
      <div className={`mt-4 rounded-xl border p-4 ${customerTier.isVip ? "border-yellow-300 bg-[#111827] text-white" : "border-[#E5E7EB] bg-[#FAFAFA] text-[#111827]"}`}>
        <div className="flex items-center justify-between gap-3">
          <p className={`flex items-center gap-1.5 text-base font-semibold ${customerTier.isVip ? "text-yellow-200" : "business-text"}`}>
            <Crown className="h-4 w-4" aria-hidden />{customerTier.badgeLabel}
          </p>
          <p className="text-lg font-semibold">{customerTier.progressPercent}%</p>
        </div>
        <p className="mt-1.5 text-sm">
          {customerTier.nextTier
            ? `${customerTier.visitsRemaining} visit${customerTier.visitsRemaining === 1 ? "" : "s"} remaining to ${customerTier.nextTier}`
            : "Top tier member with exclusive rewards available"}
        </p>
        <div className={`mt-3 h-2 overflow-hidden rounded-full ${customerTier.isVip ? "bg-white/15" : "business-secondary-bg-soft"}`}>
          <div className={`h-full rounded-full ${customerTier.isVip ? "bg-yellow-300" : "business-button"}`} style={{ width: `${customerTier.progressPercent}%` }} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InsightMetric icon={History} label="Visits completed" value={customerTier.qualifyingVisits.toString()} />
        <InsightMetric icon={Sparkles} label="Next tier" value={customerTier.nextTier ?? "Top tier"} />
        {!compact ? <InsightMetric icon={Gift} label="Rewards redeemed" value={rewardRedemptionsCount.toString()} /> : null}
        {!compact ? <InsightMetric icon={Gift} label="Bonus stamps" value={totalBonusStamps.toString()} /> : null}
        {!compact ? <InsightMetric icon={Users} label="Active programs" value={activePrograms.toString()} /> : null}
        {!compact ? <InsightMetric icon={CalendarDays} label="Customer since" value={formatDate(joinedAt)} /> : null}
      </div>
    </section>
  );
}

function ReferralSummaryPanel({ memberReference, referralCode, compact = false }: { memberReference: string; referralCode: string | null; compact?: boolean }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-4 md:p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold business-text">Referrals</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Referral investigation</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Referral performance is managed in the Referral Center. Use the referral code to filter this customer's referral activity.
          </p>
        </div>
        <Link href={`/dashboard/referrals?search=${encodeURIComponent(referralCode ?? memberReference)}`} className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
          Open Referral Center
        </Link>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Info label="Referral code" value={referralCode ?? "-"} />
        {!compact && memberReference ? <Info label="Member reference" value={memberReference} /> : null}
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
              <Link href={`/scan/${programMembership.scanToken}`} className="mt-3 inline-flex rounded-md business-button px-3 py-2 text-sm font-semibold text-white">
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
  messageType,
  googleWalletUrl,
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
  messageType: "welcome" | "resend";
  googleWalletUrl: string | null;
  compact?: boolean;
}) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-4 md:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold business-text">Card & QR</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Public card tools</h2>
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
          <CopyButton value={cardUrl} label="Copy card link" copiedLabel="Card link copied." />
        ) : (
          <form action={toggleCustomerCardAction}>
            <CsrfInput scope="dashboard:customers" />
            <input type="hidden" name="membershipUuid" value={membershipUuid} />
            <input type="hidden" name="nextStatus" value={nextCardStatus} />
            {nextCardStatus === "ACTIVE" ? (
              <button type="submit" className="w-full rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
                Enable card
              </button>
            ) : (
              <ConfirmSubmitButton
                message="Disable this customer card? The QR code can no longer be scanned."
                className="w-full rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]"
              >
                Disable card
              </ConfirmSubmitButton>
            )}
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
          messageType={messageType}
          googleWalletUrl={googleWalletUrl}
        />
      </div> : null}
    </section>
  );
}

function ProgramQrPanel({
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
    <section className="rounded-md border border-[#E5E7EB] bg-white p-4 md:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold business-text">Scan QR</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Program scan tokens</h2>
        </div>
        <Gift className="h-5 w-5 business-text" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-4">
        {programCards.map(({ programMembership, scanUrl, qrCode, nextScanStatus, googleWalletUrl, googleWalletStatus, membershipUuid }) => (
          <article key={programMembership.id} className="rounded-md border border-[#E5E7EB] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[#111827]">{programMembership.loyaltyProgram.name}</h3>
                <p className="mt-1 text-sm text-[#6B7280]">Scan token status: {scanStatusLabel(programMembership.scanStatus)}</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Google Wallet: {googleWalletStatus.configured ? googleWalletStatus.status.toString().toLowerCase().replace("_", " ") : "not configured"}
                  {googleWalletStatus.lastSyncedAt ? ` · Synced ${formatDateTime(googleWalletStatus.lastSyncedAt)}` : ""}
                </p>
                {googleWalletStatus.lastError ? <p className="mt-1 text-xs text-red-700">Last Wallet error: {googleWalletStatus.lastError}</p> : null}
                <p className="mt-3 break-all rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-2 text-xs text-[#6B7280]">{scanUrl}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <CopyButton value={scanUrl} label="Copy scan URL" copiedLabel="Scan URL copied." />
                  <a href={scanUrl} target="_blank" rel="noreferrer" className="rounded-md business-button px-4 py-2 text-sm font-semibold text-white">
                    Open scan URL
                  </a>
                  <a href={googleWalletUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] transition business-hover">
                    Regenerate Google Wallet pass
                  </a>
                  <a href={googleWalletUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] transition business-hover">
                    Preview pass
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
              <div className="flex shrink-0 flex-col items-center rounded-md border border-[#E5E7EB] bg-white p-3">
                <Image src={qrCode} alt={`${programMembership.loyaltyProgram.name} scan QR`} width={96} height={96} unoptimized />
                <p className="mt-2 text-center text-xs font-medium text-[#6B7280]">Scan QR</p>
              </div>
            </div>
          </article>
        ))}
        {programCards.length === 0 ? <p className="text-sm text-[#6B7280]">No program enrollments yet.</p> : null}
      </div>
    </section>
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

function auditMetadata(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
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
  const allowed = ["overview", "activity", "rewards", "referrals", "card"];
  return allowed.includes(tab ?? "") ? tab! : "overview";
}





