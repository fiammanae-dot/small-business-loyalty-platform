"use client";

import { useActionState } from "react";
import type { TwoFactorChallengeState } from "@/app/login/2fa/actions";
import { verifyTwoFactorLoginAction } from "@/app/login/2fa/actions";
import { RequiredMark } from "@/components/ui/RequiredMark";

const initialState: TwoFactorChallengeState = {};

export function TwoFactorChallengeForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction, isPending] = useActionState(verifyTwoFactorLoginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="csrfToken" value={csrfToken} />

      <div className="space-y-2">
        <label htmlFor="code" className="text-sm font-medium text-[#111827]">
          Authentication code<RequiredMark />
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="text"
          autoComplete="one-time-code"
          autoFocus
          required
          placeholder="123456 or backup code"
          aria-describedby="two-factor-code-help"
          className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm tracking-widest text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
        />
        <p id="two-factor-code-help" className="text-xs leading-5 text-[#6B7280]">
          Enter the 6-digit code from your authenticator app, or one of your single-use backup codes.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Verifying..." : "Verify and continue"}
      </button>
    </form>
  );
}
