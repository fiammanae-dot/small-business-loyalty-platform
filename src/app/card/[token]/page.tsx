import { CardShareActions } from "@/components/CardShareActions";
import { ReferralShareActions } from "@/components/ReferralShareActions";
import Image from "next/image";
import {
  CheckCircle2,
  Gift,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stamp,
  TicketCheck,
} from "lucide-react";
import {
  getCardUrl,
  getShortCardToken,
  maskPhoneNumber,
  resolveBranding,
} from "@/lib/customer-cards";
import { calculateCustomerTier } from "@/lib/customer-tiers";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { progressValue, programCustomerStatusLabel } from "@/lib/programs";
import { businessTypeLabels } from "@/lib/roles";
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
  const [pendingReferrals, qualifiedReferrals, referralRewards, lifetimeVisits] = await Promise.all([
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
    prisma.stampTransaction.count({
      where: {
        businessId: membership.businessId,
        customerProgramMembership: { businessCustomerMembershipId: membership.id },
      },
    }),
  ]);
  const tier = calculateCustomerTier({
    visits: lifetimeVisits,
    spend: 0,
    config: membership.business.tierSetting,
  });

  return (
    <main
      className="min-h-screen px-4 py-5 text-[#111827]"
      style={{ backgroundColor: branding.backgroundColor, color: branding.textColor }}
    >
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <section
          className="relative overflow-hidden rounded-[30px] p-5 text-white shadow-2xl"
          style={{
            background: `linear-gradient(145deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
          }}
        >
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[#111827]/15 blur-2xl" />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <div
                  aria-label={`${membership.business.name} logo`}
                  className="h-12 w-12 rounded-2xl bg-white/20 bg-cover bg-center ring-1 ring-white/30"
                  style={{ backgroundImage: `url(${branding.logoUrl})` }}
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-base font-bold text-white ring-1 ring-white/30">
                  {membership.business.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/75">{membership.business.name}</p>
                <p className="mt-1 text-sm text-white/80">{businessTypeLabels[membership.business.businessType]}</p>
              </div>
            </div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
              Loyalty Card
            </span>
          </div>

          <div className="relative mt-8">
            <p className="text-sm font-semibold text-white/75">Hi,</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight">{customerName}</h1>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-bold ring-1 ring-white/25">
              <span aria-hidden="true">{tier.badgeIcon}</span>
              <span>{tier.badgeLabel}</span>
            </div>
          </div>

          <TierProgressPanel tier={tier} visits={lifetimeVisits} branding={branding} />

          {primaryProgram ? (
            <PrimaryRewardPanel
              programMembership={primaryProgram.programMembership}
              qrCode={primaryProgram.qrCode}
              branding={branding}
            />
          ) : (
            <div className="relative mt-6 rounded-3xl bg-white p-5 text-[#111827] shadow-lg">
              <p className="font-semibold">No active loyalty program yet</p>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                Ask staff to enroll this card into a loyalty program before earning stamps.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#111827]">Share your card</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Save, copy, or share this card so staff can scan it when you visit.
          </p>
          <div className="mt-4">
            <CardShareActions
              cardUrl={cardUrl}
              businessName={membership.business.name}
              buttonColor={branding.buttonColor}
            />
          </div>
        </section>

        {programCards.length > 1 ? (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <TicketCheck className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#111827]">Other rewards</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {programCards.slice(1).map(({ programMembership, qrCode }) => (
                <ProgramRewardCard
                  key={programMembership.id}
                  programMembership={programMembership}
                  qrCode={qrCode}
                />
              ))}
            </div>
          </section>
        ) : null}

        {referralUrl ? (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#111827]">Refer a friend</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              Share your link. Rewards are granted after your friend joins and earns their first stamp.
            </p>
            <div className="mt-4 rounded-2xl bg-orange-50 p-3">
              <p className="text-xs font-semibold uppercase text-[#F97316]">Referral Link</p>
              <p className="mt-2 break-all text-sm font-semibold text-[#111827]">{referralUrl}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Info label="Pending Referrals" value={pendingReferrals.toString()} />
              <Info label="Qualified Referrals" value={qualifiedReferrals.toString()} />
              <Info label="Rewards Earned" value={`${referralRewards._sum.bonusStamps ?? 0} stamps`} />
            </div>
            <div className="mt-4">
              <ReferralShareActions referralUrl={referralUrl} businessName={membership.business.name} buttonColor={branding.buttonColor} />
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#111827]">Card details</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Info label="Card ID" value={getShortCardToken(membership.cardToken)} />
            <Info label="Member since" value={formatDate(membership.joinedAt)} />
            <Info label="Status" value="Active" />
            <Info label="Phone" value={maskPhoneNumber(customer.normalizedPhone)} />
          </div>
        </section>
      </div>
    </main>
  );
}

function TierProgressPanel({
  tier,
  visits,
  branding,
}: {
  tier: ReturnType<typeof calculateCustomerTier>;
  visits: number;
  branding: ReturnType<typeof resolveBranding>;
}) {
  const isVip = tier.isVip;
  const remainingText = tier.nextTier
    ? `${tier.visitsRemaining} visit${tier.visitsRemaining === 1 ? "" : "s"} remaining`
    : "Top Tier Member";

  return (
    <div
      className={`relative mt-6 overflow-hidden rounded-[26px] p-5 shadow-xl ${
        isVip ? "bg-[#111827] text-white ring-1 ring-yellow-300/40" : "bg-white text-[#111827]"
      }`}
    >
      {isVip ? <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-yellow-300/20 blur-2xl" /> : null}
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${isVip ? "text-yellow-200" : "text-[#F97316]"}`}>
            Customer tier
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">{tier.badgeIcon}</span>
            <h2 className="text-2xl font-bold tracking-tight">{tier.badgeLabel}</h2>
          </div>
          {isVip ? <p className="mt-2 text-sm font-semibold text-yellow-100">Exclusive Rewards Available</p> : null}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isVip ? "bg-yellow-300 text-[#111827]" : "bg-orange-50 text-[#F97316]"}`}>
          {visits} Visits
        </span>
      </div>
      <div className="relative mt-5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={isVip ? "text-white/75" : "text-[#6B7280]"}>
            {tier.nextTier ? `Progress to ${tier.nextTier.toUpperCase()}` : "Top tier progress"}
          </span>
          <span className={isVip ? "text-yellow-200" : "text-[#111827]"}>{tier.progressPercent}%</span>
        </div>
        <div className={`mt-2 h-3 overflow-hidden rounded-full ${isVip ? "bg-white/15" : "bg-orange-100"}`}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${tier.progressPercent}%`,
              background: isVip ? "linear-gradient(90deg, #FDE68A, #F59E0B)" : `linear-gradient(90deg, ${branding.secondaryColor}, ${branding.primaryColor})`,
            }}
          />
        </div>
        <p className={`mt-3 text-sm font-semibold ${isVip ? "text-yellow-100" : "text-[#111827]"}`}>
          {remainingText}
        </p>
      </div>
    </div>
  );
}

function PrimaryRewardPanel({
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
  const statusLabel = programCustomerStatusLabel({
    status: programMembership.status,
    earnedStamps: programMembership.earnedStamps,
    bonusStamps: programMembership.bonusStamps,
    requiredStamps: required,
  });

  return (
    <div className="relative mt-6 rounded-[26px] bg-white p-5 text-[#111827] shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#6B7280]">{programMembership.loyaltyProgram.name}</p>
          <div className="mt-2 flex items-end gap-2">
            <p className="customer-card-counter text-5xl font-bold tracking-tight" style={{ color: branding.primaryColor }}>
              {progress}/{required}
            </p>
            <p className="pb-2 text-sm font-semibold text-[#6B7280]">stamps</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            rewardReady ? "bg-green-50 text-green-700" : "bg-orange-50 text-[#F97316]"
          }`}
        >
          {rewardReady ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Stamp className="h-3.5 w-3.5" aria-hidden="true" />}
          {rewardReady ? "Reward Ready" : statusLabel}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-[#6B7280]">
          <span>Progress</span>
          <span>{completion}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-orange-100">
          <div
            className="customer-card-progress h-full rounded-full"
            style={{
              width: `${completion}%`,
              background: `linear-gradient(90deg, ${branding.secondaryColor}, ${branding.primaryColor})`,
            }}
          />
        </div>
      </div>

      <div
        className={`mt-5 rounded-2xl border p-4 ${
          rewardReady ? "border-green-200 bg-green-50" : "border-orange-100 bg-orange-50"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              rewardReady ? "bg-green-100 text-green-700" : "bg-white text-[#F97316]"
            }`}
          >
            <Gift className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className={`text-sm font-semibold ${rewardReady ? "text-green-800" : "text-[#F97316]"}`}>
              {rewardReady ? "Your reward is ready" : `${remaining} stamp${remaining === 1 ? "" : "s"} remaining`}
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#111827]">{programMembership.loyaltyProgram.rewardName}</h2>
            <p className="mt-1 text-sm leading-6 text-[#6B7280]">
              {rewardReady
                ? "Show the QR code below to staff to redeem your reward."
                : `Keep visiting to unlock ${programMembership.loyaltyProgram.rewardName}.`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border-2 border-dashed border-orange-200 bg-white p-4 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#F97316]">
          <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
          Scan this card
        </div>
        <div className="mx-auto mt-4 flex w-fit rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#E5E7EB]">
          <Image src={qrCode} alt={`${programMembership.loyaltyProgram.name} scan QR`} width={220} height={220} unoptimized />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#111827]">
          {rewardReady ? "Show this QR to staff to redeem" : "Show this QR to staff to earn stamps"}
        </p>
      </div>
    </div>
  );
}

function ProgramRewardCard({
  programMembership,
  qrCode,
}: {
  programMembership: ProgramMembershipView;
  qrCode: string;
}) {
  const progress = progressValue(programMembership.earnedStamps, programMembership.bonusStamps);
  const required = programMembership.loyaltyProgram.requiredStamps;
  const remaining = Math.max(required - progress, 0);
  const completion = Math.min(Math.round((progress / required) * 100), 100);
  const rewardReady = progress >= required;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#111827]">{programMembership.loyaltyProgram.name}</p>
          <p className="mt-1 text-sm text-[#6B7280]">Reward: {programMembership.loyaltyProgram.rewardName}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rewardReady ? "bg-green-50 text-green-700" : "bg-orange-50 text-[#F97316]"}`}>
          {rewardReady ? "Ready" : `${remaining} left`}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <p className="text-2xl font-bold text-[#111827]">{progress}/{required}</p>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-orange-100">
          <div className="h-full rounded-full bg-[#F97316]" style={{ width: `${completion}%` }} />
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
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-orange-100 text-sm font-bold text-[#F97316]">
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

type ProgramMembershipView = {
  id: number;
  status: string;
  earnedStamps: number;
  bonusStamps: number;
  loyaltyProgram: {
    name: string;
    requiredStamps: number;
    rewardName: string;
  };
};
