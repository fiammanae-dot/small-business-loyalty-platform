import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { createCsrfToken } from "@/lib/csrf";
import { redirectAuthenticatedUser } from "@/lib/session";
import { BrandLockup } from "@/components/BrandLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { getT } from "@/i18n/server";

export default async function LoginPage() {
  await redirectAuthenticatedUser();
  const t = await getT();

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-b from-orange-50/80 via-white to-white px-4 py-8 text-[#111827] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[1fr_440px] lg:items-center">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex" aria-label={t("shell.home")}>
            <BrandLockup variant="stacked" className="h-40 w-auto" priority />
          </Link>
          <div className="mt-12 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-sm font-semibold text-[#C2410C] shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("login.eyebrow")}
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#111827] xl:text-5xl">
              {t("login.headline")}
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#64748B]">
              {t("login.lead")}
            </p>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-[#334155]">
              <LoginBenefit text={t("login.benefit1")} />
              <LoginBenefit text={t("login.benefit2")} />
              <LoginBenefit text={t("login.benefit3")} />
            </div>
          </div>
        </section>

        <section className="w-full rounded-2xl border border-orange-100 bg-white p-5 shadow-2xl shadow-orange-100/70 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <Link href="/" className="inline-flex lg:hidden" aria-label={t("shell.home")}>
              <BrandLockup className="h-10 w-auto" priority />
            </Link>
            <LanguageSwitch className="ms-auto" />
          </div>
          <div className="mt-8 lg:mt-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#F26A21]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#F26A21]">{t("login.secureLogin")}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{t("login.welcomeBack")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              {t("login.useAccount")}
            </p>
          </div>
          <div className="mt-6">
            <LoginForm csrfToken={createCsrfToken("login")} />
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginBenefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-orange-100 bg-white px-4 py-3 shadow-sm">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#F26A21]" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
