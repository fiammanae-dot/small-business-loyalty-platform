"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ForgotPasswordState } from "@/app/forgot-password/actions";
import { forgotPasswordAction } from "@/app/forgot-password/actions";
import { RequiredMark } from "@/components/ui/RequiredMark";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-[#111827]">
          Email address<RequiredMark />
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
          placeholder="you@example.com"
        />
      </div>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Sending..." : "Send Reset Link"}
      </button>

      <Link href="/login" className="block text-center text-sm font-semibold text-[#F97316] hover:text-[#EA580C]">
        Back to login
      </Link>
    </form>
  );
}
