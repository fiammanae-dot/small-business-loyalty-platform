import QRCode from "qrcode";
import { ReferralInviteActions } from "@/components/ReferralInviteActions";
import { getBaseUrl } from "@/lib/customer-cards";
import { fromStoredTier } from "@/lib/customer-tiers";
import { prisma } from "@/lib/prisma";
import { businessTypeLabels } from "@/lib/roles";
import { extractReferralCode, resolveReferralLandingReferrer } from "@/lib/referrals";

export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const referralCode = extractReferralCode(code);

  if (!referralCode) {
    return <ReferralUnavailable />;
  }

  const referrer = await resolveReferralLandingReferrer(referralCode);

  if (!referrer) {
    return <ReferralUnavailable />;
  }

  const brandColor = referrer.business.branding?.buttonColor ?? "#F97316";
  const referralUrl = `${await getBaseUrl()}/referral/${encodeURIComponent(referralCode)}`;
  const referralQrDataUrl = await QRCode.toDataURL(referralUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: {
      dark: "#111827",
      light: "#FFFFFF",
    },
  });
  const referrerName = `${referrer.globalCustomer.firstName} ${referrer.globalCustomer.lastName ?? ""}`.trim();
  const referrerDisplayName = referrerName || "your referrer";
  const rewardMessage = referrerName
    ? `Join the loyalty program and complete your first visit. Both you and ${referrerName} will receive referral rewards.`
    : "Join the loyalty program and complete your first visit. Both you and your referrer will receive referral rewards.";
  const referrerTier = fromStoredTier(referrer.currentTier);
  const displayReferralId = friendlyReferralId(referralCode);
  const initials = referrer.business.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "LB";
  const registeredReferral = await prisma.referral.findFirst({
    where: {
      businessId: referrer.businessId,
      referralCode,
      referredMembershipId: { not: null },
      status: { in: ["PENDING", "QUALIFIED"] },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (registeredReferral) {
    return (
      <ReferralRegistered
        brandColor={brandColor}
        businessName={referrer.business.name}
        businessType={businessTypeLabels[referrer.business.businessType]}
        logoUrl={referrer.business.branding?.logoUrl ?? null}
        initials={initials}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF7ED] px-4 py-6 text-[#111827] sm:py-10">
      <section className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#FED7AA] bg-white shadow-sm">
        <div className="px-5 py-6 text-white" style={{ backgroundColor: brandColor }}>
          <div className="flex items-center gap-3">
            {referrer.business.branding?.logoUrl ? (
              <img
                src={referrer.business.branding.logoUrl}
                alt={`${referrer.business.name} logo`}
                className="h-14 w-14 rounded-xl bg-white object-cover p-1"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 text-base font-bold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Referral invitation</p>
              <h1 className="mt-1 break-words text-2xl font-semibold leading-tight">{referrer.business.name}</h1>
              <p className="mt-1 text-sm text-white/85">{businessTypeLabels[referrer.business.businessType]}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-center">
            <p className="text-sm text-[#6B7280]">You have been invited by</p>
            <p className="mt-1 text-xl font-semibold text-[#111827]">{referrerDisplayName}</p>
            {referrerTier ? (
              <p className="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white" style={{ backgroundColor: brandColor }}>
                {referrerTier} member
              </p>
            ) : null}
          </div>

          <p className="mt-4 rounded-xl bg-[#FFF7ED] px-4 py-3 text-center text-sm font-medium leading-6 text-[#9A3412]">
            {rewardMessage}
          </p>

          <div className="mt-5 rounded-3xl border-2 bg-white p-4 text-center shadow-sm" style={{ borderColor: brandColor }}>
            <p className="mx-auto mb-3 inline-flex rounded-full bg-[#111827] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">READY TO SHOW IN STORE</p>
            <p className="text-lg font-semibold text-[#111827]">Show this QR code to staff</p>
            <p className="mt-1 text-sm text-[#6B7280]">Staff will scan it when you join.</p>
            <img src={referralQrDataUrl} alt="Referral invitation QR code" className="mx-auto mt-4 h-72 w-72 max-w-full rounded-2xl" />
            <div className="mt-4 rounded-2xl bg-[#F9FAFB] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Referral ID</p>
              <p className="mt-1 text-2xl font-bold tracking-wide text-[#111827]">{displayReferralId}</p>
              <p className="mt-2 text-xs leading-5 text-[#6B7280]">
                Staff can scan this QR code or enter Referral ID {displayReferralId} during enrollment.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#111827]">How it works</h2>
            <ol className="mt-3 space-y-3 text-sm text-[#374151]">
              {[
                "Visit the branch",
                "Show this QR code to staff",
                "Complete your first loyalty visit",
                "Your referral reward is activated",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {index + 1}
                  </span>
                  <span className="pt-1 leading-5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <ReferralInviteActions
            referralUrl={referralUrl}
            businessName={referrer.business.name}
            referrerName={referrerName}
            brandColor={brandColor}
          />
        </div>
      </section>
    </main>
  );
}

function ReferralRegistered({
  brandColor,
  businessName,
  businessType,
  logoUrl,
  initials,
}: {
  brandColor: string;
  businessName: string;
  businessType: string;
  logoUrl: string | null;
  initials: string;
}) {
  return (
    <main className="min-h-screen bg-[#FFF7ED] px-4 py-6 text-[#111827] sm:py-10">
      <section className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#FED7AA] bg-white shadow-sm">
        <div className="px-5 py-6 text-white" style={{ backgroundColor: brandColor }}>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={`${businessName} logo`} className="h-14 w-14 rounded-xl bg-white object-cover p-1" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 text-base font-bold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Referral invitation</p>
              <h1 className="mt-1 break-words text-2xl font-semibold leading-tight">{businessName}</h1>
              <p className="mt-1 text-sm text-white/85">{businessType}</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white" style={{ backgroundColor: brandColor }}>
            OK
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Referral Registered</h1>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">
            This referral has already been used and is linked to a customer account.
          </p>
        </div>
      </section>
    </main>
  );
}
function friendlyReferralId(referralCode: string) {
  let hash = 0;
  for (const character of referralCode) {
    hash = (hash * 31 + character.charCodeAt(0)) % 10000;
  }
  return `RF-${hash.toString().padStart(4, "0")}`;
}

function ReferralUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <section className="w-full max-w-sm rounded-md border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-orange-100 text-sm font-bold text-[#F97316]">
          LB
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Referral not available</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          This referral link is unavailable or has been disabled.
        </p>
      </section>
    </main>
  );
}