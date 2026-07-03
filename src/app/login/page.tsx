import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { createCsrfToken } from "@/lib/csrf";
import { redirectAuthenticatedUser } from "@/lib/session";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-b from-orange-50/80 via-white to-white px-4 py-8 text-[#111827] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[1fr_440px] lg:items-center">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Loyalty Card UAE homepage">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white shadow-sm">
              LC
            </span>
            <span className="text-base font-semibold text-[#111827]">Loyalty Card UAE</span>
          </Link>
          <div className="mt-12 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-sm font-semibold text-[#EA580C] shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Secure workspace access
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#111827] xl:text-5xl">
              Sign in to manage loyalty operations.
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#64748B]">
              Existing Loyalty Card UAE users can access customer cards, scanner workflows, rewards, referrals, billing, and platform administration from the right workspace.
            </p>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-[#334155]">
              <LoginBenefit text="Role-based dashboards for every team member" />
              <LoginBenefit text="Protected sessions and secure password reset" />
              <LoginBenefit text="Operational tools for scanner, rewards, and customers" />
            </div>
          </div>
        </section>

        <section className="w-full rounded-2xl border border-orange-100 bg-white p-5 shadow-2xl shadow-orange-100/70 sm:p-7">
          <Link href="/" className="flex items-center gap-3 lg:hidden" aria-label="Loyalty Card UAE homepage">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
              LC
            </span>
            <span className="text-base font-semibold">Loyalty Card UAE</span>
          </Link>
          <div className="mt-8 lg:mt-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#F97316]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#F97316]">Secure login</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              Use your assigned account to access your Loyalty Card UAE workspace.
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
      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#F97316]" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
