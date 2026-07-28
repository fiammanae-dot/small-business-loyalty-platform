import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { TwoFactorChallengeForm } from "@/components/TwoFactorChallengeForm";
import { createCsrfToken } from "@/lib/csrf";
import { getTwoFactorPendingUserId } from "@/lib/two-factor";

export default async function TwoFactorChallengePage() {
  // The pending cookie is the only thing that unlocks this page. Without it
  // (never signed in, or it expired) there is nothing to verify.
  const pendingUserId = await getTwoFactorPendingUserId();
  if (!pendingUserId) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50/80 via-white to-white px-4 py-10 text-[#111827]">
      <section className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-2xl shadow-orange-100/70">
        <Link href="/" className="flex items-center gap-2" aria-label="Loyalty Card UAE homepage">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">LC</span>
          <span className="text-sm font-semibold">Loyalty Card UAE</span>
        </Link>

        <div className="mt-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#F97316]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#F97316]">Two-factor authentication</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Confirm it&apos;s you</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Your password was accepted. Enter the code from your authenticator app to finish signing in.
          </p>
        </div>

        <div className="mt-6">
          <TwoFactorChallengeForm csrfToken={createCsrfToken("login:2fa")} />
        </div>

        <p className="mt-6 text-sm text-[#6B7280]">
          Lost your device?{" "}
          <Link href="/support" className="font-semibold text-[#F97316] hover:underline">
            Contact support
          </Link>
        </p>
      </section>
    </main>
  );
}
