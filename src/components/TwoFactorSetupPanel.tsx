"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import type { TwoFactorSetupState } from "@/app/account/two-factor/actions";
import { confirmTwoFactorAction, disableTwoFactorAction, regenerateBackupCodesAction } from "@/app/account/two-factor/actions";
import { RequiredMark } from "@/components/ui/RequiredMark";

const initialState: TwoFactorSetupState = {};

export type TwoFactorEnrollmentView = {
  encryptedSecret: string;
  manualEntryKey: string;
  qrCodeDataUrl: string;
};

export function TwoFactorSetupPanel({
  csrfToken,
  enabled,
  activatedAt,
  remainingBackupCodes,
  enrollment,
  required,
}: {
  csrfToken: string;
  enabled: boolean;
  activatedAt: string | null;
  remainingBackupCodes: number;
  enrollment: TwoFactorEnrollmentView | null;
  required: boolean;
}) {
  return enabled ? (
    <EnabledState csrfToken={csrfToken} activatedAt={activatedAt} remainingBackupCodes={remainingBackupCodes} required={required} />
  ) : (
    <SetupState csrfToken={csrfToken} enrollment={enrollment} required={required} />
  );
}

function SetupState({
  csrfToken,
  enrollment,
  required,
}: {
  csrfToken: string;
  enrollment: TwoFactorEnrollmentView | null;
  required: boolean;
}) {
  const [state, formAction, isPending] = useActionState(confirmTwoFactorAction, initialState);

  if (state.backupCodes?.length) {
    return <BackupCodesPanel codes={state.backupCodes} message={state.success ?? "Two-factor authentication is now active."} />;
  }

  if (!enrollment) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Two-factor authentication is not available right now. Contact your system administrator.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      {required ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Your administrator requires two-factor authentication. Finish this setup to continue using the app.
        </p>
      ) : null}

      <ol className="grid gap-4 text-sm leading-6 text-[#334155]">
        <li>
          <span className="font-semibold text-[#111827]">1. Scan this QR code</span> with Google Authenticator, 1Password, Authy, or any TOTP app.
          <div className="mt-3 inline-flex rounded-xl border border-[#E5E7EB] bg-white p-3">
            {/* Data URL produced server-side by the same qrcode dependency used for loyalty cards. */}
            <Image src={enrollment.qrCodeDataUrl} alt="Two-factor authentication setup QR code" width={200} height={200} unoptimized />
          </div>
        </li>
        <li>
          <span className="font-semibold text-[#111827]">2. Or enter this key manually</span>
          <code className="mt-2 block rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 font-mono text-sm tracking-widest text-[#111827]">
            {enrollment.manualEntryKey}
          </code>
        </li>
      </ol>

      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="encryptedSecret" value={enrollment.encryptedSecret} />
        <label htmlFor="confirm-code" className="text-sm font-medium text-[#111827]">
          3. Enter the 6-digit code to confirm<RequiredMark />
        </label>
        <input
          id="confirm-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder="123456"
          className="h-11 w-full max-w-xs rounded-md border border-[#E5E7EB] bg-white px-3 text-sm tracking-widest outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
        />

        {state.error ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="h-11 w-fit rounded-md bg-[#F97316] px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Verifying..." : "Turn on two-factor authentication"}
        </button>
      </form>
    </div>
  );
}

function EnabledState({
  csrfToken,
  activatedAt,
  remainingBackupCodes,
  required,
}: {
  csrfToken: string;
  activatedAt: string | null;
  remainingBackupCodes: number;
  required: boolean;
}) {
  const [regenerateState, regenerateAction, regeneratePending] = useActionState(regenerateBackupCodesAction, initialState);
  const [disableState, disableAction, disablePending] = useActionState(disableTwoFactorAction, initialState);
  const [showDisable, setShowDisable] = useState(false);

  if (regenerateState.backupCodes?.length) {
    return <BackupCodesPanel codes={regenerateState.backupCodes} message={regenerateState.success ?? "New backup codes generated."} />;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-800">Two-factor authentication is on</p>
          <p className="text-xs text-emerald-700">
            {activatedAt ? `Activated ${activatedAt}. ` : ""}
            {remainingBackupCodes} unused backup {remainingBackupCodes === 1 ? "code" : "codes"} remaining.
          </p>
        </div>
      </div>

      {disableState.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{disableState.success}</p>
      ) : null}

      <form action={regenerateAction} className="grid gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
          <p className="text-sm font-bold text-[#111827]">Regenerate backup codes</p>
        </div>
        <p className="text-sm leading-6 text-[#64748B]">
          Generates a new set and immediately invalidates your existing codes. Enter a current authentication code to continue.
        </p>
        <label htmlFor="regenerate-code" className="text-sm font-medium text-[#111827]">
          Authentication code<RequiredMark />
        </label>
        <input
          id="regenerate-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder="123456"
          className="h-11 w-full max-w-xs rounded-md border border-[#E5E7EB] bg-white px-3 text-sm tracking-widest outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
        />
        {regenerateState.error ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{regenerateState.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={regeneratePending}
          className="h-11 w-fit rounded-md border border-[#CBD5E1] bg-white px-5 text-sm font-semibold text-[#111827] transition hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {regeneratePending ? "Generating..." : "Generate new backup codes"}
        </button>
      </form>

      {required ? (
        <p className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#64748B]">
          Your administrator requires two-factor authentication for your role, so it cannot be turned off.
        </p>
      ) : (
        <div className="grid gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-[#B91C1C]" aria-hidden="true" />
            <p className="text-sm font-bold text-[#111827]">Turn off two-factor authentication</p>
          </div>
          {showDisable ? (
            <form action={disableAction} className="grid gap-3">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <label htmlFor="disable-code" className="text-sm font-medium text-[#111827]">
                Authentication code
              </label>
              <input
                id="disable-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                className="h-11 w-full max-w-xs rounded-md border border-[#E5E7EB] bg-white px-3 text-sm tracking-widest outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
              />
              <label htmlFor="disable-password" className="text-sm font-medium text-[#111827]">
                Or your account password
              </label>
              <input
                id="disable-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="h-11 w-full max-w-xs rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
              />
              {disableState.error ? (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{disableState.error}</p>
              ) : null}
              <button
                type="submit"
                disabled={disablePending}
                className="h-11 w-fit rounded-md border border-[#FECACA] bg-[#FEF2F2] px-5 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {disablePending ? "Turning off..." : "Confirm and turn off"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowDisable(true)}
              className="h-11 w-fit rounded-md border border-[#CBD5E1] bg-white px-5 text-sm font-semibold text-[#111827] transition hover:bg-[#F1F5F9]"
            >
              Turn off two-factor authentication
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BackupCodesPanel({ codes, message }: { codes: string[]; message: string }) {
  return (
    <div className="grid gap-4">
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-900">Save these backup codes now</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          Each code works once if you lose access to your authenticator app. This is the only time they are shown.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm text-[#111827]">
          {codes.map((code) => (
            <li key={code} className="rounded-md border border-amber-200 bg-white px-3 py-2 tracking-widest">{code}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
