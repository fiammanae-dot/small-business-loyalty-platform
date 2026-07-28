import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { TwoFactorSetupPanel, type TwoFactorEnrollmentView } from "@/components/TwoFactorSetupPanel";
import { createCsrfToken } from "@/lib/csrf";
import { formatDate } from "@/lib/format";
import { getTwoFactorRequirement } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { roleHomePath } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { canUseTwoFactor, countUnusedBackupCodes, createTwoFactorEnrollmentOffer, isTwoFactorConfigured } from "@/lib/two-factor";
import { isTwoFactorRequiredForRole } from "@/lib/two-factor-policy";

export default async function TwoFactorSetupPage() {
  // Uses getCurrentUser() rather than requireRole() for the same reason
  // /change-password does: this page is the destination of the enforcement
  // redirect, so guarding it with the gate would loop forever.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canUseTwoFactor(user.role)) redirect(roleHomePath[user.role]);

  const [record, requirement, remainingBackupCodes] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true, twoFactorActivatedAt: true } }),
    getTwoFactorRequirement(),
    countUnusedBackupCodes(user.id),
  ]);

  const enabled = record?.twoFactorEnabled ?? false;
  const required = isTwoFactorRequiredForRole(user.role, requirement);

  // A fresh secret is minted per page view and only persisted once the user
  // proves their app produces a matching code.
  let enrollment: TwoFactorEnrollmentView | null = null;
  if (!enabled && isTwoFactorConfigured()) {
    const offer = await createTwoFactorEnrollmentOffer(user.email);
    enrollment = {
      encryptedSecret: offer.encryptedSecret,
      manualEntryKey: offer.manualEntryKey,
      qrCodeDataUrl: offer.qrCodeDataUrl,
    };
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-gradient-to-b from-orange-50/60 via-white to-white px-4 py-10 text-[#111827]">
      <section className="w-full max-w-2xl rounded-2xl border border-orange-100 bg-white p-6 shadow-xl shadow-orange-100/50">
        <Link href="/" className="flex items-center gap-2" aria-label="Loyalty Card UAE homepage">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">LC</span>
          <span className="text-sm font-semibold">Loyalty Card UAE</span>
        </Link>

        <div className="mt-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#F97316]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#F97316]">Account security</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Two-factor authentication</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Add a second step to your sign-in using an authenticator app. Backup codes let you back in if you lose your device.
          </p>
        </div>

        <div className="mt-6">
          <TwoFactorSetupPanel
            csrfToken={createCsrfToken("account:two-factor")}
            enabled={enabled}
            activatedAt={record?.twoFactorActivatedAt ? formatDate(record.twoFactorActivatedAt) : null}
            remainingBackupCodes={remainingBackupCodes}
            enrollment={enrollment}
            required={required}
          />
        </div>

        {!required || enabled ? (
          <p className="mt-8 text-sm text-[#6B7280]">
            <Link href={roleHomePath[user.role]} className="font-semibold text-[#F97316] hover:underline">
              Back to workspace
            </Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
