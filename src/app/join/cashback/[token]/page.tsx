import Link from "next/link";
import { joinCashbackProgramAction } from "@/app/join/cashback/[token]/actions";
import { BusinessBrandingProvider } from "@/components/BusinessBrandingProvider";
import { ReferralReferrerLookupPreview } from "@/components/ReferralReferrerLookupPreview";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { resolveBusinessBranding } from "@/lib/business-branding";
import { getCardUrl } from "@/lib/customer-cards";
import { prisma } from "@/lib/prisma";
import { CustomerLanguageSwitch } from "@/components/CustomerLanguageSwitch";
import { I18nProvider } from "@/i18n/client";
import { directionFor, type Locale } from "@/i18n/locales";
import { getT, getVisitorLocale } from "@/i18n/server";
import type { Translate } from "@/i18n/translate";

// Public join page for the cashback program - the cashback twin of
// /join/program/<token>, reached from the cashback join QR or link.
export default async function CashbackJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    card?: string;
    error?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    birthday?: string;
    marketingConsent?: string;
    ref?: string;
    referralCode?: string;
    referredBySearch?: string;
  }>;
}) {
  const { token } = await params;
  const qs = await searchParams;
  const locale = await getVisitorLocale();
  const t = await getT(locale);
  const referredBySearch = qs.referredBySearch ?? qs.ref ?? "";
  const selectedReferralCode = qs.referralCode ?? qs.ref ?? "";
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
  const settings = isUuid
    ? await prisma.businessCashbackSettings.findUnique({
        where: { joinToken: token },
        include: { business: { select: { name: true, status: true, branding: true } } },
      })
    : null;

  if (!settings?.enabled || settings.business.status !== "ACTIVE") {
    return <JoinUnavailable locale={locale} t={t} />;
  }

  const programName = settings.name?.trim() || t("pass.cashback");
  const rate = Number(settings.ratePercent.toString());
  const successMembership = qs.card
    ? await prisma.businessCustomerMembership.findFirst({
        where: { cardToken: qs.card, businessId: settings.businessId, status: "ACTIVE", cashbackJoinedAt: { not: null } },
      })
    : null;
  const successCardUrl = successMembership ? await getCardUrl(successMembership.cardToken) : null;
  const branding = resolveBusinessBranding(settings.business.branding);

  return (
    <I18nProvider locale={locale}>
    <BusinessBrandingProvider branding={branding}>
      <main lang={locale} dir={directionFor(locale)} className="min-h-screen px-4 py-8" style={{ backgroundColor: branding.backgroundColor, color: branding.textColor }}>
        <section className="mx-auto w-full max-w-lg overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white shadow-2xl shadow-slate-200/60">
          <div className="business-bg px-6 py-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-current opacity-80">{t("join.cashbackEyebrow")}</p>
              <CustomerLanguageSwitch />
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">{settings.business.name}</h1>
            <p className="mt-2 text-lg font-semibold text-current opacity-90">{programName}</p>
          </div>

          {successMembership && successCardUrl ? (
            <div className="p-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">{t("join.youreIn")}</p>
                <h2 className="mt-2 text-2xl font-bold text-emerald-950">{t("join.welcome", { name: successMembership.firstName })}</h2>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  {t("join.cashbackWelcome", { rate })}
                </p>
              </div>
              <Link
                href={successCardUrl}
                className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl business-button px-5 text-sm font-bold"
              >
                {t("join.openMyCard")}
              </Link>
              <p className="mt-3 break-all rounded-xl bg-[#F8FAFC] p-3 text-xs text-[#64748B]">{successCardUrl}</p>
            </div>
          ) : (
            <div className="p-6">
              {qs.error ? (
                <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{qs.error}</p>
              ) : null}
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <p className="text-sm font-semibold text-[#0F172A]">{t("join.cashbackRate", { rate })}</p>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  {t("join.cashbackExplain")}
                </p>
              </div>

              <form action={joinCashbackProgramAction} className="mt-5 grid gap-4">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="locale" value={locale} />
                <Input label={t("join.firstName")} name="firstName" autoComplete="given-name" required defaultValue={qs.firstName} />
                <Input label={t("join.lastName")} name="lastName" autoComplete="family-name" defaultValue={qs.lastName} />
                <Input label={t("join.phone")} name="phone" autoComplete="tel" required placeholder="0501234567" defaultValue={qs.phone} dir="ltr" />
                <p className="text-xs leading-5 text-[#64748B]">
                  {t("join.phoneHelp")}
                </p>
                <Input label={t("join.email")} name="email" type="email" autoComplete="email" defaultValue={qs.email} dir="ltr" />
                <Input label={t("join.birthday")} name="birthday" type="date" autoComplete="bday" defaultValue={qs.birthday} />
                <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                  <input type="checkbox" name="marketingConsent" defaultChecked={qs.marketingConsent === "on"} className="h-4 w-4 rounded border-[#E5E7EB]" />
                  {t("join.marketingConsent")}
                </label>
                <div className="grid gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{t("join.referredTitle")}</p>
                    <p className="mt-1 text-xs leading-5 text-[#64748B]">{t("join.referredHelp")}</p>
                  </div>
                  <Input label={t("join.referrer")} name="referredBySearch" placeholder={t("join.referrerPlaceholder")} defaultValue={referredBySearch} />
                  <ReferralReferrerLookupPreview businessId={settings.businessId} query={referredBySearch} selectedReferralCode={selectedReferralCode} locale={locale} />
                  <button
                    type="submit"
                    formAction={`/join/cashback/${token}`}
                    formMethod="get"
                    className="w-fit rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#111827]"
                  >
                    {t("join.checkReferrer")}
                  </button>
                </div>
                <button type="submit" className="min-h-12 rounded-xl business-button px-5 text-sm font-bold transition hover:brightness-95">
                  {t("join.submitCashback")}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
    </BusinessBrandingProvider>
    </I18nProvider>
  );
}

function Input({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
  placeholder,
  defaultValue,
  dir,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
  dir?: "ltr";
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#111827]">
      <span>
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        dir={dir}
        className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm font-normal outline-none transition business-ring focus:ring-0"
      />
    </label>
  );
}

function JoinUnavailable({ locale, t }: { locale: Locale; t: Translate }) {
  return (
    <main lang={locale} dir={directionFor(locale)} className="flex min-h-screen items-center justify-center bg-white px-4">
      <section className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-[#111827]">{t("join.cashbackUnavailableTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">{t("join.cashbackUnavailableText")}</p>
      </section>
    </main>
  );
}
