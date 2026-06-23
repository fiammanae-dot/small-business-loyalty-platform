import { CardShareActions } from "@/components/CardShareActions";
import { ReferralShareActions } from "@/components/ReferralShareActions";
import { SaveCardImageButton } from "@/components/SaveCardImageButton";
import Image from "next/image";
import { Gift, Link2, QrCode, Sparkles } from "lucide-react";
import { getCardUrl, resolveBranding } from "@/lib/customer-cards";
import { resolveCardThemeColors } from "@/lib/card-themes";
import { calculateCustomerTier } from "@/lib/customer-tiers";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { progressValue } from "@/lib/programs";
import { getScanQrDataUrl } from "@/lib/scan";
import { getReferralUrl } from "@/lib/referrals";

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

  if (!membership || membership.cardStatus !== "ACTIVE" || membership.status !== "ACTIVE") {
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
  const referralUrl = membership.referralCode ? await getReferralUrl(membership.referralCode) : null;
  const programCards = await Promise.all(
    membership.programMemberships.map(async (programMembership) => ({
      programMembership,
      qrCode: await getScanQrDataUrl(programMembership.scanToken),
    })),
  );
  const primaryProgram = programCards[0] ?? null;
  const primaryCardTheme = resolveCardThemeColors({
    cardTheme: primaryProgram?.programMembership.loyaltyProgram.cardTheme,
    branding,
  });
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

  return (
    <main
      className="min-h-screen px-4 py-5 text-[#1E293B]"
      style={{ backgroundColor: branding.backgroundColor, color: branding.textColor }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 md:max-w-2xl">
        <div data-loyalty-card-export className="flex flex-col gap-4 rounded-[34px] bg-white">
          <LoyaltyWalletCard
            businessName={membership.business.name}
            branding={branding}
            customerName={customerName}
            memberSince={formatDate(membership.createdAt)}
            tier={tier}
            qrCode={primaryProgram?.qrCode ?? null}
            cardTheme={primaryCardTheme}
            rewardReady={
              primaryProgram
                ? progressValue(primaryProgram.programMembership.earnedStamps, primaryProgram.programMembership.bonusStamps) >=
                  primaryProgram.programMembership.loyaltyProgram.requiredStamps
                : false
            }
          />

          {primaryProgram ? (
            <LoyaltyProgressSection programMembership={primaryProgram.programMembership} branding={branding} cardTheme={primaryCardTheme} />
          ) : (
            <section className="rounded-[28px] border bg-white p-5 shadow-sm" style={{ borderColor: withAlpha(branding.primaryColor, 0.18) }}>
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: branding.textColor }}>Loyalty progress</p>
              <h2 className="mt-2 text-xl font-bold text-[#1E293B]">No active loyalty program yet</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Ask staff to enroll this card into a loyalty program before earning stamps.
              </p>
            </section>
          )}
        </div>

        <TierStatusSection tier={tier} branding={branding} />

        {referralUrl ? (
          <ReferralCardSection
            referralUrl={referralUrl}
            referralCode={membership.referralCode}
            businessName={membership.business.name}
            branding={branding}
            pendingReferrals={pendingReferrals}
            qualifiedReferrals={qualifiedReferrals}
            rewardsEarned={`${referralRewards._sum.bonusStamps ?? 0} stamps`}
          />
        ) : null}

        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
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
              targetSelector="[data-loyalty-card-export]"
              customerName={customerName}
              buttonColor={branding.buttonColor}
            />
          </div>
        </section>

        {programCards.length > 1 ? (
          <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" style={{ color: branding.primaryColor }} aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#1E293B]">Additional programs</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {programCards.slice(1).map(({ programMembership, qrCode }) => (
                <ProgramRewardCard
                  key={programMembership.id}
                  programMembership={programMembership}
                  qrCode={qrCode}
                  branding={branding}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function LoyaltyWalletCard({
  businessName,
  branding,
  customerName,
  memberSince,
  tier,
  qrCode,
  cardTheme,
  rewardReady,
}: {
  businessName: string;
  branding: ReturnType<typeof resolveBranding>;
  customerName: string;
  memberSince: string;
  tier: ReturnType<typeof calculateCustomerTier>;
  qrCode: string | null;
  cardTheme: ReturnType<typeof resolveCardThemeColors>;
  rewardReady: boolean;
}) {
  const tierTone = getTierTone(tier.badgeLabel, branding);

  return (
    <section
      className="relative overflow-hidden rounded-[34px] p-5 text-white shadow-2xl sm:p-6"
      style={{
        background: `radial-gradient(circle at 15% 10%, rgba(255,255,255,0.25), transparent 32%), linear-gradient(145deg, ${cardTheme.accent}, ${cardTheme.secondary})`,
      }}
    >
      <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#1E293B]/25 blur-3xl" />
      <div className="absolute inset-x-6 top-0 h-px bg-white/40" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <div
              aria-label={`${businessName} logo`}
              className="h-14 w-14 rounded-2xl bg-white/20 bg-cover bg-center ring-1 ring-white/35"
              style={{ backgroundImage: `url(${branding.logoUrl})` }}
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-base font-black text-white ring-1 ring-white/35">
              {businessName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">LoyaltyBase</p>
            <h1 className="mt-1 text-lg font-bold leading-tight">{businessName}</h1>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-bold ring-1 ring-white/25">
            {rewardReady ? "Reward Ready" : "Live Card"}
          </span>
        </div>
      </div>

      <div className="relative mt-9">
        <p className="text-sm font-semibold text-white/70">Customer</p>
        <h2 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{customerName}</h2>
        <div
          className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-black ring-1 ${tierTone.pill}`}
        >
          <span aria-hidden="true">{tier.badgeIcon}</span>
          <span>{tier.badgeLabel}</span>
        </div>
      </div>

      <div className="relative mt-7 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="rounded-3xl bg-white/15 p-4 ring-1 ring-white/20 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Member Since</p>
          <p className="mt-2 text-2xl font-black tracking-wide">{memberSince}</p>
          <p className="mt-2 text-sm font-medium text-white/75">Show this card when earning stamps or redeeming rewards.</p>
        </div>

        <div className="rounded-[28px] bg-white p-3 text-center shadow-xl">
          {qrCode ? (
            <Image src={qrCode} alt={`${businessName} customer card QR code`} width={178} height={178} unoptimized priority />
          ) : (
            <div
              className="flex h-[178px] w-[178px] items-center justify-center rounded-2xl text-sm font-bold"
              style={{ backgroundColor: withAlpha(cardTheme.accent, 0.1), color: cardTheme.accent }}
            >
              QR pending
            </div>
          )}
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#64748B]">Scan this card</p>
        </div>
      </div>
    </section>
  );
}

function LoyaltyProgressSection({
  programMembership,
  branding,
  cardTheme,
}: {
  programMembership: ProgramMembershipView;
  branding: ReturnType<typeof resolveBranding>;
  cardTheme: ReturnType<typeof resolveCardThemeColors>;
}) {
  const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
  const required = programMembership.loyaltyProgram.requiredStamps;
  const remaining = Math.max(required - progress, 0);
  const completion = Math.min(Math.round((progress / required) * 100), 100);
  const rewardReady = progress >= required;

  return (
    <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: branding.textColor }}>Loyalty Progress</p>
          <h2 className="mt-2 text-2xl font-black text-[#1E293B]">{programMembership.loyaltyProgram.name}</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${rewardReady ? "bg-green-50 text-green-700" : ""}`}
          style={rewardReady ? undefined : { backgroundColor: withAlpha(branding.primaryColor, 0.1), color: branding.primaryColor }}
        >
          {rewardReady ? "Complete" : `${remaining} left`}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div>
          <div className="mt-2 flex items-end gap-2">
            <p className="customer-card-counter text-6xl font-black tracking-tight" style={{ color: branding.primaryColor }}>
              {progress}
            </p>
            <p className="pb-3 text-lg font-black text-[#94A3B8]">/{required}</p>
          </div>
          <p className="text-sm font-semibold text-[#64748B]">Visits Completed</p>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-[#64748B]">
            <span>Next Reward</span>
            <span>{completion}%</span>
          </div>
          <div className="mt-3 h-4 overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(cardTheme.secondary, 0.18) }}>
            <div
              className="customer-card-progress h-full rounded-full"
              style={{
                width: `${completion}%`,
                background: `linear-gradient(90deg, ${cardTheme.secondary}, ${cardTheme.accent})`,
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Info label="Current Visits" value={progress.toString()} />
            <Info label="Required Visits" value={required.toString()} />
            <Info label="Visits Remaining" value={remaining === 0 ? "Ready now" : remaining.toString()} />
            <Info label="Next Reward" value={programMembership.loyaltyProgram.rewardName} />
          </div>
        </div>
      </div>
    </section>
  );
}

function TierStatusSection({
  tier,
  branding,
}: {
  tier: ReturnType<typeof calculateCustomerTier>;
  branding: ReturnType<typeof resolveBranding>;
}) {
  const { visitsRemaining: remainingVisits, progressPercent: tierCompletion, nextTier } = tier;
  const tierTone = getTierTone(tier.badgeLabel, branding);

  return (
    <section className={`rounded-[28px] border p-5 shadow-sm ${tierTone.card}`} style={tierTone.style}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${tierTone.label}`} style={tierTone.labelStyle}>Customer tier</p>
          <div className="mt-3 flex items-center gap-3">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${tierTone.icon}`} style={tierTone.iconStyle} aria-hidden="true">
              {tier.badgeIcon}
            </span>
            <div>
              <h2 className="text-2xl font-black text-[#1E293B]">{tier.badgeLabel}</h2>
              {tier.isVip ? <p className="mt-1 text-sm font-bold text-yellow-700">Exclusive Rewards Available</p> : null}
            </div>
          </div>
        </div>
        <Sparkles className={`h-6 w-6 ${tierTone.sparkle}`} style={tierTone.sparkleStyle} aria-hidden="true" />
      </div>

      {!tier.isVip && nextTier ? (
        <div className="mt-5 rounded-3xl bg-white/80 p-4 ring-1 ring-black/5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-[#64748B]">
            <span>Next Tier</span>
            <span>{nextTier}</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(branding.secondaryColor, 0.18) }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${tierCompletion}%`,
                background: `linear-gradient(90deg, ${branding.secondaryColor}, ${branding.primaryColor})`,
              }}
            />
          </div>
          <p className="mt-3 text-sm font-semibold text-[#64748B]">
            {remainingVisits} visit{remainingVisits === 1 ? "" : "s"} until the next customer level.
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-3xl bg-[#1E293B] p-4 text-white">
          <p className="text-sm font-bold">Top tier member</p>
          <p className="mt-1 text-sm text-white/75">You are already at the highest LoyaltyBase tier.</p>
        </div>
      )}
    </section>
  );
}

function ReferralCardSection({
  referralUrl,
  referralCode,
  businessName,
  branding,
  pendingReferrals,
  qualifiedReferrals,
  rewardsEarned,
}: {
  referralUrl: string;
  referralCode: string | null;
  businessName: string;
  branding: ReturnType<typeof resolveBranding>;
  pendingReferrals: number;
  qualifiedReferrals: number;
  rewardsEarned: string;
}) {
  return (
    <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl transition hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ outlineColor: branding.primaryColor }}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(branding.primaryColor, 0.1), color: branding.primaryColor }}>
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black text-[#1E293B]">Refer a friend</h2>
              <p className="mt-1 text-sm text-[#64748B]">Share your link and track referral rewards.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide transition" style={{ backgroundColor: withAlpha(branding.primaryColor, 0.08), color: branding.primaryColor }}>
            Details
          </span>
        </summary>

        <div className="mt-4 border-t border-[#E5E7EB] pt-4">
          <p className="text-sm leading-6 text-[#64748B]">
            Share your referral link. Rewards are granted after your friend joins and earns their first stamp.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl p-4" style={{ backgroundColor: withAlpha(branding.primaryColor, 0.08) }}>
              <p className="text-xs font-black uppercase tracking-wide" style={{ color: branding.textColor }}>Referral Code</p>
              <p className="mt-2 break-all font-mono text-lg font-black text-[#1E293B]">{referralCode}</p>
            </div>
            <div className="rounded-2xl bg-[#F8FAFC] p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#64748B]">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                Referral Link
              </p>
              <p className="mt-2 line-clamp-2 break-all text-sm font-semibold text-[#1E293B]">{referralUrl}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Info label="Pending Referrals" value={pendingReferrals.toString()} />
            <Info label="Qualified Referrals" value={qualifiedReferrals.toString()} />
            <Info label="Rewards Earned" value={rewardsEarned} />
          </div>

          <div className="mt-4">
            <ReferralShareActions referralUrl={referralUrl} businessName={businessName} buttonColor={branding.buttonColor} />
          </div>
        </div>
      </details>
    </section>
  );
}

function getTierTone(label: string, branding?: ReturnType<typeof resolveBranding>) {
  const normalized = label.toUpperCase();
  if (normalized.includes("VIP")) {
    return {
      card: "border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-[#FFF7ED]",
      icon: "bg-[#1E293B] text-yellow-300",
      label: "text-yellow-700",
      pill: "bg-[#1E293B]/80 text-yellow-200 ring-yellow-200/30",
      sparkle: "text-yellow-500",
    };
  }
  if (normalized.includes("GOLD")) {
    return {
      card: "border-yellow-200 bg-yellow-50",
      icon: "bg-yellow-100 text-yellow-700",
      label: "text-yellow-700",
      pill: "bg-yellow-100/90 text-yellow-900 ring-yellow-200",
      sparkle: "text-yellow-500",
    };
  }
  if (normalized.includes("SILVER")) {
    return {
      card: "border-slate-200 bg-slate-50",
      icon: "bg-slate-200 text-slate-700",
      label: "text-slate-600",
      pill: "bg-white/25 text-white ring-white/30",
      sparkle: "text-slate-500",
    };
  }

  return {
    card: "border bg-white",
    icon: "",
    label: "",
    pill: "bg-white/25 text-white ring-white/30",
    sparkle: "",
    style: branding ? { borderColor: withAlpha(branding.primaryColor, 0.18), backgroundColor: withAlpha(branding.primaryColor, 0.06) } : undefined,
    iconStyle: branding ? { backgroundColor: withAlpha(branding.primaryColor, 0.12), color: branding.primaryColor } : undefined,
    labelStyle: branding ? { color: branding.textColor } : undefined,
    sparkleStyle: branding ? { color: branding.primaryColor } : undefined,
  };
}

function ProgramRewardCard({
  programMembership,
  qrCode,
  branding,
}: {
  programMembership: ProgramMembershipView;
  qrCode: string;
  branding: ReturnType<typeof resolveBranding>;
}) {
  const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
  const required = programMembership.loyaltyProgram.requiredStamps;
  const remaining = Math.max(required - progress, 0);
  const completion = Math.min(Math.round((progress / required) * 100), 100);
  const rewardReady = progress >= required;
  const cardTheme = resolveCardThemeColors({ cardTheme: programMembership.loyaltyProgram.cardTheme, branding });

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: withAlpha(cardTheme.accent, 0.18), backgroundColor: withAlpha(cardTheme.accent, 0.03) }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#111827]">{programMembership.loyaltyProgram.name}</p>
          <p className="mt-1 text-sm text-[#6B7280]">Reward: {programMembership.loyaltyProgram.rewardName}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${rewardReady ? "bg-green-50 text-green-700" : ""}`}
          style={rewardReady ? undefined : { backgroundColor: withAlpha(branding.primaryColor, 0.1), color: branding.primaryColor }}
        >
          {rewardReady ? "Ready" : `${remaining} left`}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <p className="text-2xl font-bold text-[#111827]">{progress}/{required}</p>
        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(branding.secondaryColor, 0.18) }}>
          <div className="h-full rounded-full" style={{ width: `${completion}%`, background: `linear-gradient(90deg, ${branding.secondaryColor}, ${branding.primaryColor})` }} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#FAFAFA] p-3">
        <Image src={qrCode} alt={`${programMembership.loyaltyProgram.name} scan QR`} width={84} height={84} unoptimized />
        <p className="text-sm font-medium text-[#111827]">
          {rewardReady ? "Show to redeem this reward." : "Show to earn stamps for this program."}
        </p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFA] p-3">
      <p className="text-xs font-medium text-[#6B7280]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#111827]">{value}</p>
    </div>
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

function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return hexColor;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type ProgramMembershipView = {
  id: number;
  status: string;
  earnedStamps: number;
  bonusStamps: number;
  loyaltyProgram: {
    name: string;
    requiredStamps: number;
    rewardName: string;
    cardTheme: import("@prisma/client").CardTheme;
  };
  updatedAt: Date;
};


