import QRCode from "qrcode";
import { BusinessBrandingProvider } from "@/components/BusinessBrandingProvider";
import { BusinessLogoAvatar } from "@/components/BusinessLogoAvatar";
import { ReferralInviteActions } from "@/components/ReferralInviteActions";
import { resolveBusinessBranding, type ResolvedBusinessBranding } from "@/lib/business-branding";
import { getBaseUrl } from "@/lib/customer-cards";
import { areTiersVisible, fromStoredTier } from "@/lib/customer-tiers";
import { prisma } from "@/lib/prisma";
import { extractReferralCode, resolveReferralLandingReferrer } from "@/lib/referrals";
import { describeReferralReward, getReferralSettings } from "@/lib/referral-settings";
import { BrandMark } from "@/components/BrandLogo";
import { CustomerLanguageSwitch } from "@/components/CustomerLanguageSwitch";
import { I18nProvider } from "@/i18n/client";
import { directionFor, type Locale } from "@/i18n/locales";
import { getT, getVisitorLocale } from "@/i18n/server";
import type { Translate } from "@/i18n/translate";

export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const locale = await getVisitorLocale();
  const t = await getT(locale);
  const referralCode = extractReferralCode(code);

  if (!referralCode) {
    return <ReferralUnavailable locale={locale} t={t} />;
  }

  const referrer = await resolveReferralLandingReferrer(referralCode);

  if (!referrer) {
    return <ReferralUnavailable locale={locale} t={t} />;
  }

  const branding = resolveBusinessBranding(referrer.business.branding);
  const brandColor = branding.buttonColor;
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
  const referrerName = `${referrer.firstName} ${referrer.lastName ?? ""}`.trim();
  const referrerDisplayName = referrerName || t("referral.yourReferrer");
  // Promise only what the business actually pays (see referral-settings.ts).
  const reward = describeReferralReward(
    await getReferralSettings(referrer.businessId),
    (await prisma.businessCashbackSettings.findUnique({ where: { businessId: referrer.businessId }, select: { currency: true } }))?.currency ?? "AED",
    locale,
  );
  const rewardMessage = reward.friend && reward.referrer
    ? t("referral.rewardBoth", { friend: reward.friend, referrer: referrerDisplayName, reward: reward.referrer })
    : reward.referrer
      ? t("referral.rewardReferrer", { referrer: referrerDisplayName, reward: reward.referrer })
      : reward.friend
        ? t("referral.rewardFriend", { friend: reward.friend })
        : t("referral.rewardNone");
  const tiersVisible = areTiersVisible(
    (await prisma.businessMembershipSettings.findUnique({ where: { businessId: referrer.businessId }, select: { enabled: true } }))?.enabled,
  );
  const referrerTier = tiersVisible ? fromStoredTier(referrer.currentTier) : null;
  const displayReferralId = friendlyReferralId(referralCode);
  const initials = referrer.business.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "LC";
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
        businessName={referrer.business.name}
        businessType={t(`businessType.${referrer.business.businessType}`)}
        locale={locale}
        t={t}
        branding={branding}
        logoUrl={referrer.business.branding?.logoUrl ?? null}
        initials={initials}
      />
    );
  }

  return (
    <I18nProvider locale={locale}>
    <BusinessBrandingProvider branding={branding}>
    <main lang={locale} dir={directionFor(locale)} className="min-h-screen px-4 py-6 sm:py-10" style={{ backgroundColor: branding.backgroundColor, color: branding.textColor }}>
      <section className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="business-bg px-5 py-6">
          <div className="flex items-center gap-3">
            <BusinessLogoAvatar
              logoUrl={referrer.business.branding?.logoUrl ?? null}
              businessName={referrer.business.name}
              fallback={initials}
              size="lg"
              className="rounded-xl bg-white/20 text-current"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-current opacity-80">{t("referral.invitation")}</p>
              <h1 className="mt-1 break-words text-2xl font-semibold leading-tight">{referrer.business.name}</h1>
              <p className="mt-1 text-sm text-current opacity-85">{t(`businessType.${referrer.business.businessType}`)}</p>
            </div>
            <CustomerLanguageSwitch className="self-start" />
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-center">
            <p className="text-sm text-[#6B7280]">{t("referral.invitedBy")}</p>
            <p className="mt-1 text-xl font-semibold text-[#111827]">{referrerDisplayName}</p>
            {referrerTier ? (
              <p className="mt-2 inline-flex rounded-full business-button px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                {t("referral.memberBadge", { tier: t(`tier.${referrerTier}`) })}
              </p>
            ) : null}
          </div>

          <p className="mt-4 rounded-xl business-bg-soft px-4 py-3 text-center text-sm font-medium leading-6 business-primary-strong">
            {rewardMessage}
          </p>

          <div className="mt-5 rounded-3xl border-2 bg-white p-4 text-center shadow-sm" style={{ borderColor: brandColor }}>
            <p className="mx-auto mb-3 inline-flex rounded-full bg-[#111827] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{t("referral.readyToShow")}</p>
            <p className="text-lg font-semibold text-[#111827]">{t("referral.showQr")}</p>
            <p className="mt-1 text-sm text-[#6B7280]">{t("referral.staffScan")}</p>
            <img src={referralQrDataUrl} alt={t("referral.qrAlt")} className="mx-auto mt-4 h-72 w-72 max-w-full rounded-2xl" />
            <div className="mt-4 rounded-2xl bg-[#F9FAFB] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{t("referral.id")}</p>
              <p className="mt-1 text-2xl font-bold tracking-wide text-[#111827]" dir="ltr">{displayReferralId}</p>
              <p className="mt-2 text-xs leading-5 text-[#6B7280]">
                {t("referral.idHelp", { id: `\u2066${displayReferralId}\u2069` })}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#111827]">{t("referral.howItWorks")}</h2>
            <ol className="mt-3 space-y-3 text-sm text-[#374151]">
              {[t("referral.step1"), t("referral.step2"), t("referral.step3"), t("referral.step4")].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full business-button text-xs font-bold"
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
    </BusinessBrandingProvider>
    </I18nProvider>
  );
}

function ReferralRegistered({
  businessName,
  businessType,
  branding,
  logoUrl,
  initials,
  locale,
  t,
}: {
  businessName: string;
  businessType: string;
  branding: ResolvedBusinessBranding;
  logoUrl: string | null;
  initials: string;
  locale: Locale;
  t: Translate;
}) {
  return (
    <BusinessBrandingProvider branding={branding}>
    <main lang={locale} dir={directionFor(locale)} className="min-h-screen px-4 py-6 sm:py-10" style={{ backgroundColor: branding.backgroundColor, color: branding.textColor }}>
      <section className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="business-bg px-5 py-6">
          <div className="flex items-center gap-3">
            <BusinessLogoAvatar
              logoUrl={logoUrl}
              businessName={businessName}
              fallback={initials}
              size="lg"
              className="rounded-xl bg-white/20 text-current"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-current opacity-80">{t("referral.invitation")}</p>
              <h1 className="mt-1 break-words text-2xl font-semibold leading-tight">{businessName}</h1>
              <p className="mt-1 text-sm text-current opacity-85">{businessType}</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full business-button text-xl font-bold">
            OK
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-[#111827]">{t("referral.registeredTitle")}</h1>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">
            {t("referral.registeredText")}
          </p>
        </div>
      </section>
    </main>
    </BusinessBrandingProvider>
  );
}
function friendlyReferralId(referralCode: string) {
  let hash = 0;
  for (const character of referralCode) {
    hash = (hash * 31 + character.charCodeAt(0)) % 10000;
  }
  return `RF-${hash.toString().padStart(4, "0")}`;
}

function ReferralUnavailable({ locale, t }: { locale: Locale; t: Translate }) {
  return (
    <main lang={locale} dir={directionFor(locale)} className="flex min-h-screen items-center justify-center bg-white px-4">
      <section className="w-full max-w-sm rounded-md border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF7F2] text-[#141210]">
          <BrandMark className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[#111827]">{t("referral.unavailableTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          {t("referral.unavailableText")}
        </p>
      </section>
    </main>
  );
}
