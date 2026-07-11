"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import type { ResetPasswordState } from "@/app/reset-password/actions";
import { resetPasswordAction } from "@/app/reset-password/actions";
import { RequiredMark } from "@/components/ui/RequiredMark";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ csrfToken, token }: { csrfToken: string; token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium text-[#111827]">
          New password<RequiredMark />
        </label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 pr-12 text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
            placeholder="Create a strong password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#6B7280] transition hover:bg-orange-50 hover:text-[#F97316] focus:outline-none focus:ring-4 focus:ring-orange-100"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-[#111827]">
          Confirm password<RequiredMark />
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 pr-12 text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
            placeholder="Confirm your password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((value) => !value)}
            aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
            aria-pressed={showConfirmPassword}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#6B7280] transition hover:bg-orange-50 hover:text-[#F97316] focus:outline-none focus:ring-4 focus:ring-orange-100"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <p className="text-xs leading-5 text-[#6B7280]">
        Use at least 8 characters with uppercase, lowercase, a number, and a special character.
      </p>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <p>{state.success}</p>
          <Link href="/login" className="font-semibold text-emerald-800 underline">
            Go to login
          </Link>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || Boolean(state.success)}
        className="h-11 w-full rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}
