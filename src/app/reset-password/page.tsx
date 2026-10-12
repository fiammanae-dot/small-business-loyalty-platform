import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { createCsrfToken } from "@/lib/csrf";
import { redirectAuthenticatedUser } from "@/lib/session";
import { BrandLockup } from "@/components/BrandLogo";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await redirectAuthenticatedUser();
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-[#111827]">
      <section className="w-full max-w-md rounded-md border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <Link href="/" className="inline-flex" aria-label="Loyalty Card UAE homepage">
          <BrandLockup className="h-10 w-auto" priority />
        </Link>
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">Password reset</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create a new password</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Reset links expire after 30 minutes and can be used once.
          </p>
        </div>
        <div className="mt-6">
          {token ? (
            <ResetPasswordForm csrfToken={createCsrfToken("reset-password")} token={token} />
          ) : (
            <div className="space-y-4 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
              <p>This reset link is missing a token. Request a new link to continue.</p>
              <Link href="/forgot-password" className="font-semibold underline">
                Request reset link
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
