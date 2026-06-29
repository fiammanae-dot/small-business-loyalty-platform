import { CardShareActions } from "@/components/CardShareActions";
import { SaveCardImageButton } from "@/components/SaveCardImageButton";
import { Gift, QrCode } from "lucide-react";
import { getCardQrDataUrl, getCardUrl, resolveBranding } from "@/lib/customer-cards";
import { resolveCardThemeColors } from "@/lib/card-themes";
import { calculateCustomerTier } from "@/lib/customer-tiers";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
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
        },
      },
      programMemberships: { include: { loyaltyProgram: true }, orderBy: { enrolledAt: "desc" } },
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
  const customer = membership.globalCustomer;
  const customerName = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
  const cardUrl = await getCardUrl(token);
  const cardQrCode = await getCardQrDataUrl(token);
  const referralUrl = membership.referralCode && membership.referralEnabled ? await getReferralUrl(membership.referralCode) : null;
  const programCards = await Promise.all(
    membership.programMemberships.map(async (programMembership) => {
      const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
      const required = programMembership.loyaltyProgram.requiredStamps;
      const remaining = Math.max(required - progress, 0);
      const completion = Math.min(Math.round((progress / required) * 100), 100);
      const rewardReady = progress >= required;
      const theme = resolveCardThemeColors({ cardTheme: programMembership.loyaltyProgram.cardTheme, branding });

      return {
        programMembership,
        qrCode: await getScanQrDataUrl(programMembership.scanToken),
        progress,
        required,
        remaining,
        completion,
        rewardReady,
        theme,
      };
    }),
  );
  const primaryProgram = programCards[0] ?? null;
  const primaryCardTheme = primaryProgram?.theme ?? resolveCardThemeColors({ cardTheme: null, branding });
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
  const tier = calculateCustomerTier({
    visitEvents: visitEvents.map((visit) => visit.createdAt),
    config: membership.business.tierSetting,
    achievedTier: membership.currentTier,
  });
  if (membership.currentTier !== tier.storedTier) {
    await prisma.businessCustomerMembership.update({
      where: { id: membership.id },
      data: { currentTier: tier.storedTier, tierUpdatedAt: new Date() },
    });
  }
  const walletCardProps = {
    businessName: membership.business.name,
    businessLogoUrl: branding.logoUrl,
    customerName,
    memberSince: formatDate(membership.createdAt),
    tierLabel: tier.badgeLabel,
    tierIcon: tier.badgeIcon,
    qrCode: primaryProgram?.qrCode ?? cardQrCode,
    theme: primaryCardTheme,
    rewardReady: primaryProgram?.rewardReady ?? false,
    qrHelperText: primaryProgram ? "Scan this card" : "Show this QR code to staff to find your customer card.",
    programName: primaryProgram?.programMembership.loyaltyProgram.name ?? null,
    rewardName: primaryProgram?.programMembership.loyaltyProgram.rewardName ?? null,
    progress: primaryProgram?.progress ?? 0,
    required: primaryProgram?.required ?? 0,
    remaining: primaryProgram?.remaining ?? 0,
    completion: primaryProgram?.completion ?? 0,
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

        <div className="mx-auto w-full max-w-[360px]">
          <TierStatusPanel
            badgeLabel={tier.badgeLabel}
            badgeIcon={tier.badgeIcon}
            isVip={tier.isVip}
            nextTier={tier.nextTier}
            visitsRemaining={tier.visitsRemaining}
            progressPercent={tier.progressPercent}
            theme={primaryCardTheme}
          />
        </div>

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
              recipientPhone={customer.normalizedPhone}
              whatsappLabel="Share via WhatsApp"
              showWallet={false}
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
              {programCards.slice(1).map(({ programMembership, qrCode, progress, required, remaining, completion, rewardReady, theme }) => (
                <ProgramRewardCard
                  key={programMembership.id}
                  programName={programMembership.loyaltyProgram.name}
                  rewardName={programMembership.loyaltyProgram.rewardName}
                  qrCode={qrCode}
                  progress={progress}
                  required={required}
                  remaining={remaining}
                  completion={completion}
                  rewardReady={rewardReady}
                  theme={theme}
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
          LB
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Card not available</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          This customer card is unavailable or has been disabled.
        </p>
      </section>
    </main>
  );
}


