import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { createCsrfToken } from "@/lib/csrf";
import { getCurrentUser } from "@/lib/session";
import { BrandLockup } from "@/components/BrandLogo";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-[#111827]">
      <section className="w-full max-w-md rounded-md border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <Link href="/" className="inline-flex" aria-label="Loyalty Card UAE homepage">
          <BrandLockup className="h-10 w-auto" priority />
        </Link>
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">Account security</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create a new password</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            {user?.forcePasswordChange
              ? "Your temporary password worked. Please create a new password before continuing."
              : "Update your password to keep your account secure."}
          </p>
        </div>
        <div className="mt-6">
          <ChangePasswordForm csrfToken={createCsrfToken("change-password")} />
        </div>
      </section>
    </main>
  );
}
