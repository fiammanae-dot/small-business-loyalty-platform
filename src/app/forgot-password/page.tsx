import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { createCsrfToken } from "@/lib/csrf";
import { redirectAuthenticatedUser } from "@/lib/session";

export default async function ForgotPasswordPage() {
  await redirectAuthenticatedUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-[#111827]">
      <section className="w-full max-w-md rounded-md border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
            LC
          </span>
          <span className="text-sm font-semibold">Loyalty Card UAE</span>
        </Link>
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">Password reset</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Enter your account email and we will send a reset link if the account is active.
          </p>
        </div>
        <div className="mt-6">
          <ForgotPasswordForm csrfToken={createCsrfToken("forgot-password")} />
        </div>
      </section>
    </main>
  );
}
