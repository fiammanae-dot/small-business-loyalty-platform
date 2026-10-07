import { CardShareActions } from "@/components/CardShareActions";
import { SaveCardImageButton } from "@/components/SaveCardImageButton";
import { Gift, QrCode } from "lucide-react";
import { getCardQrDataUrl, getCardUrl, resolveBranding } from "@/lib/customer-cards";
import { resolveCardThemeColors } from "@/lib/card-themes";
import type { CardDesignInput } from "@/lib/card-design";
import { buildCardRenderModel } from "@/lib/card-render-model";
import { areTiersVisible, calculateCustomerTier, computeTierMaintenance, tierQualificationWindowLabels } from "@/lib/customer-tiers";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
import { membershipSessionSummary } from "@/lib/membership-sessions";
import { getNextReward, getReadyRewards, singleCardReward } from "@/lib/rewards";
import { getScanQrDataUrl } from "@/lib/scan";
import { getReferralUrl } from "@/lib/referrals";
import {
  LoyaltyCardBackExport,
  LoyaltyCardFrontExport,
  LoyaltyWalletCard,
  ProgramRewardCard,
  ReferralPanel,
  TierStatusPanel,
} from "@/components/public-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicCustomerCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const membership = await prisma.businessCustomerMembership.findUnique({
    where: { cardToken: token },
    include: {
      globalCustomer: true,
      business: {
        include: {
          branding: true,
          tierSetting: true,
          membershipSettings: true,
        },
      },
      programMemberships: {
        // The card must name the NEXT reward, which on a card with a milestone is
        // not the program's final one.
        include: { loyaltyProgram: { include: { programRewards: { orderBy: { atStamp: "asc" } } } } },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!membership || membership.cardStatus !== "ACTIVE" || membership.status !== "ACTIVE" || membership.business.status !== "ACTIVE") {
    return <CardUnavailable />;
  }

  await prisma.businessCustomerMembership.update({
    where: { id: membership.id },
    data: { cardLastViewedAt: new Date() },
  });

  const branding = resolveBranding(membership.business.branding);
  const customerName = `${membership.firstName} ${membership.lastName ?? ""}`.trim();
  const cardUrl = await getCardUrl(token);
  const cardQrCode = await getCardQrDataUrl(token);
  const referralUrl = membership.referralCode && membership.referralEnabled ? await getReferralUrl(membership.referralCode) : null;
  const programCards = await Promise.all(
    membership.programMemberships.map(async (programMembership) => {
      const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
      const isMembership = programMembership.loyaltyProgram.isMembership;
      const programCardDesign = programMembership.loyaltyProgram.cardDesign as CardDesignInput;
      const theme = resolveCardThemeColors({ cardTheme: programMembership.loyaltyProgram.cardTheme, branding, cardDesign: programCardDesign });

      if (isMembership) {
        // A prepaid membership is issued full and depletes. The card shows the
        // sessions the customer has LEFT; there is no reward to work toward.
        const summary = membershipSessionSummary({
          requiredStamps: programMembership.loyaltyProgram.requiredStamps,
          earnedStamps: programMembership.earnedStamps,
          bonusStamps: programMembership.bonusStamps,
          sessionsForfeited: programMembership.sessionsForfeited,
        });
        const sessionsRemaining = summary.remaining;
        const sessionsTotal = summary.total;
        const completion = sessionsTotal > 0 ? Math.round((sessionsRemaining / sessionsTotal) * 100) : 0;
        const statusText =
          sessionsRemaining > 0
            ? `${sessionsRemaining} of ${sessionsTotal} session${sessionsTotal === 1 ? "" : "s"} left`
            : "Membership complete";
        return {
          programMembership,
          qrCode: await getScanQrDataUrl(programMembership.scanToken),
          isMembership: true,
          sessionsTotal,
          sessionsRemaining,
          statusText,
          progress: sessionsRemaining,
          required: sessionsTotal,
          remaining: sessionsRemaining,
          completion,
          rewardReady: false,
          rewardName: programMembership.loyaltyProgram.rewardName,
          theme,
        };
      }

      const required = programMembership.loyaltyProgram.requiredStamps;
      const cardInput = {
        earnedStamps: programMembership.earnedStamps,
        bonusStamps: programMembership.bonusStamps,
        rewards: programMembership.loyaltyProgram.programRewards.length
          ? programMembership.loyaltyProgram.programRewards
          : singleCardReward(programMembership.loyaltyProgram),
        claimedRewardStamps: programMembership.claimedRewardStamps,
      };
      // Count down to the reward the customer is actually working toward. On a
      // nine-slot card with a milestone at five, someone on visit 2 is three
      // away from the discount, not seven away from the wash.
      const readyRewards = getReadyRewards(cardInput);
      const nextReward = getNextReward(cardInput);
      const remaining = nextReward ? Math.max(nextReward.atStamp - progress, 0) : 0;
      const completion = Math.min(Math.round((progress / required) * 100), 100);
      const rewardReady = readyRewards.length > 0;
      // The reward to name: what is waiting now, or what is coming next.
      const rewardName =
        readyRewards[0]?.rewardName ?? nextReward?.rewardName ?? programMembership.loyaltyProgram.rewardName;

      return {
        programMembership,
        qrCode: await getScanQrDataUrl(programMembership.scanToken),
        isMembership: false,
        sessionsTotal: 0,
        sessionsRemaining: 0,
        statusText: null as string | null,
        progress,
        required,
        remaining,
        completion,
        rewardReady,
        rewardName,
        theme,
      };
    }),
  );
  const primaryProgram = programCards[0] ?? null;
  const primaryGoogleWalletUrl = primaryProgram ? `/api/wallet/google/save/${primaryProgram.programMembership.scanToken}` : null;
  const primaryAppleWalletUrl = primaryProgram ? `/api/wallet/apple/${primaryProgram.programMembership.scanToken}` : null;
  const cardDesign = primaryProgram?.programMembership.loyaltyProgram.cardDesign as CardDesignInput;
  const lastUpdatedAt = [
    membership.updatedAt,
    membership.cardLastViewedAt,
    ...membership.programMemberships.map((programMembership) => programMembership.updatedAt),
  ]
    .filter(Boolean)
    .sort((a, b) => b!.getTime() - a!.getTime())[0] ?? membership.updatedAt;
  const [pendingReferrals, qualifiedReferrals, referralRewards, visitEvents] = await Promise.all([
    prisma.referral.count({
      where: { businessId: membership.businessId, referrerMembershipId: membership.id, status: "PENDING" },
    }),
    prisma.referral.count({
      where: { businessId: membership.businessId, referrerMembershipId: membership.id, status: "QUALIFIED" },
    }),
    prisma.referralReward.aggregate({
      where: { businessId: membership.businessId, referral: { referrerMembershipId: membership.id }, status: "GRANTED" },
      _sum: { bonusStamps: true },
      _count: { id: true },
    }),
    prisma.stampTransaction.findMany({
      where: {
        businessId: membership.businessId,
        customerProgramMembership: { businessCustomerMembershipId: membership.id },
      },
      select: { createdAt: true },
    }),
  ]);
  const tierVisitDates = visitEvents.map((visit) => visit.createdAt);
  const tier = calculateCustomerTier({
    visitEvents: tierVisitDates,
    config: membership.business.tierSetting,
    achievedTier: membership.currentTier,
  });
  const tierMaintenance = computeTierMaintenance({
    visitEvents: tierVisitDates,
    config: membership.business.tierSetting,
    tier: tier.tier,
  });
  const tierWindowLabel = tierQualificationWindowLabels[tier.tierQualificationWindow];
  if (membership.currentTier !== tier.storedTier) {
    await prisma.businessCustomerMembership.update({
      where: { id: membership.id },
      data: { currentTier: tier.storedTier, tierUpdatedAt: new Date() },
    });
  }
  const tiersVisible = areTiersVisible(membership.business.membershipSettings?.enabled);
  const primaryCardModel = buildCardRenderModel({
    branding,
    cardDesign,
    cardTheme: primaryProgram?.programMembership.loyaltyProgram.cardTheme ?? null,
    business: {
      name: membership.business.name,
      cardUrl,
    },
    customer: {
      name: customerName,
      memberSince: formatDate(membership.createdAt),
      tierLabel: tier.badgeLabel,
      tierIcon: tier.badgeIcon,
      phone: membership.normalizedPhone,
    },
    program: primaryProgram
      ? {
          name: primaryProgram.programMembership.loyaltyProgram.name,
          rewardName: primaryProgram.rewardName,
          progress: primaryProgram.progress,
          required: primaryProgram.required,
          remaining: primaryProgram.remaining,
          completion: primaryProgram.completion,
          rewardReady: primaryProgram.rewardReady,
        }
      : null,
    membership:
      primaryProgram?.isMembership
        ? { sessionsRemaining: primaryProgram.sessionsRemaining, totalSessions: primaryProgram.sessionsTotal }
        : null,
    qr: {
      code: primaryProgram?.qrCode ?? cardQrCode,
      helperText: primaryProgram ? "Scan this card" : "Show this QR code to staff to find your customer card.",
    },
    tiersHidden: !tiersVisible,
  });
  const primaryCardTheme = primaryCardModel.resolvedColors;
  const walletCardProps = {
    businessName: primaryCardModel.business.name,
    businessLogoUrl: primaryCardModel.business.logoUrl,
    customerName: primaryCardModel.customer.name,
    memberSince: primaryCardModel.customer.memberSince,
    tierLabel: primaryCardModel.customer.tierLabel,
    tierIcon: primaryCardModel.customer.tierIcon,
    qrCode: primaryCardModel.qr.code,
    theme: primaryCardModel.resolvedColors,
    rewardReady: primaryCardModel.progress.rewardReady,
    qrHelperText: primaryCardModel.qr.helperText,
    programName: primaryCardModel.reward.programName,
    rewardName: primaryCardModel.reward.rewardName,
    progress: primaryCardModel.progress.current,
    required: primaryCardModel.progress.hasProgram ? primaryCardModel.progress.required : 0,
    remaining: primaryCardModel.progress.remaining,
    completion: primaryCardModel.progress.completion,
    statusText: primaryCardModel.progress.statusText,
    cardDesign: primaryCardModel.design,
  };

  return (
    <main
      className="min-h-screen px-4 py-5 text-[#1E293B]"
      style={{ backgroundColor: primaryCardTheme.pageBackground, color: branding.textColor }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 md:max-w-2xl">
        <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden="true">
          <div data-loyalty-card-front-export>
            <LoyaltyCardFrontExport wallet={walletCardProps} />
          </div>
          <div data-loyalty-card-back-export>
            <LoyaltyCardBackExport wallet={walletCardProps} />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[360px] flex-col gap-4 rounded-[34px] bg-white">
          <LoyaltyWalletCard {...walletCardProps} />
        </div>

        {tiersVisible ? (
          <div className="mx-auto w-full max-w-[360px]">
            <TierStatusPanel
              badgeLabel={tier.badgeLabel}
              badgeIcon={tier.badgeIcon}
              isVip={tier.isVip}
              nextTier={tier.nextTier}
              visitsRemaining={tier.visitsRemaining}
              progressPercent={tier.progressPercent}
              theme={primaryCardTheme}
              maintainThreshold={tierMaintenance.maintainThreshold}
              windowedVisits={tierMaintenance.windowedVisits}
              expiresAt={tierMaintenance.expiresAt ? tierMaintenance.expiresAt.toISOString() : null}
              isPermanent={tierMaintenance.isPermanent}
              windowLabel={tierWindowLabel}
            />
          </div>
        ) : null}

        {referralUrl ? (
          <div className="mx-auto w-full max-w-[360px]">
            <ReferralPanel
              referralUrl={referralUrl}
              referralCode={membership.referralCode}
              businessName={membership.business.name}
              pendingReferrals={pendingReferrals}
              qualifiedReferrals={qualifiedReferrals}
              rewardsEarned={`${referralRewards._sum.bonusStamps ?? 0} stamps`}
              buttonColor={branding.buttonColor}
              theme={primaryCardTheme}
            />
          </div>
        ) : null}

        <section className="mx-auto w-full max-w-[360px] rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5" style={{ color: primaryCardTheme.accent }} aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#1E293B]">Save Your Card</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            This link stays the same and always shows your latest stamps, reward status, tier, and QR code.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Last Updated: {formatDateTime(lastUpdatedAt)}
          </p>
          <div className="mt-4 space-y-3">
            <CardShareActions
              cardUrl={cardUrl}
              businessName={membership.business.name}
              customerName={customerName}
              recipientPhone={membership.normalizedPhone}
              whatsappLabel="Share via WhatsApp"
              googleWalletUrl={primaryGoogleWalletUrl}
              appleWalletUrl={primaryAppleWalletUrl}
              buttonColor={branding.buttonColor}
            />
            <SaveCardImageButton
              frontTargetSelector="[data-loyalty-card-front-export]"
              backTargetSelector="[data-loyalty-card-back-export]"
              customerName={customerName}
              buttonColor={branding.buttonColor}
            />
          </div>
        </section>

        {programCards.length > 1 ? (
          <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" style={{ color: primaryCardTheme.accent }} aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#1E293B]">Additional programs</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {programCards.slice(1).map(({ programMembership, qrCode, progress, required, remaining, completion, rewardReady, rewardName, theme, isMembership }) => (
                <ProgramRewardCard
                  key={programMembership.id}
                  programName={programMembership.loyaltyProgram.name}
                  rewardName={rewardName}
                  qrCode={qrCode}
                  progress={progress}
                  required={required}
                  remaining={remaining}
                  completion={completion}
                  rewardReady={rewardReady}
                  theme={theme}
                  isMembership={isMembership}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function CardUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <section className="w-full max-w-sm rounded-md border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#FFF7ED] text-sm font-bold text-[#F97316]">
          LC
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Card not available</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          This customer card is unavailable or has been disabled.
        </p>
      </section>
    </main>
  );
}


