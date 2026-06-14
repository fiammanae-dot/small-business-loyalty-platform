import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { createCsrfToken } from "@/lib/csrf";
import { redirectAuthenticatedUser } from "@/lib/session";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-[#111827]">
      <section className="w-full max-w-md rounded-md border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
            LB
          </span>
          <span className="text-sm font-semibold">LoyaltyBase</span>
        </Link>
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">Secure login</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Use your assigned account to access your workspace.
          </p>
        </div>
        <div className="mt-6">
          <LoginForm csrfToken={createCsrfToken("login")} />
        </div>
      </section>
    </main>
  );
}
