"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import type { ChangePasswordState } from "@/app/change-password/actions";
import { changePasswordAction } from "@/app/change-password/actions";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <PasswordField
        id="newPassword"
        name="newPassword"
        label="New password"
        showPassword={showNewPassword}
        onToggle={() => setShowNewPassword((value) => !value)}
        autoComplete="new-password"
      />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm new password"
        showPassword={showConfirmPassword}
        onToggle={() => setShowConfirmPassword((value) => !value)}
        autoComplete="new-password"
      />

      <p className="text-xs leading-5 text-[#6B7280]">
        Use at least 12 characters with uppercase, lowercase, number, and symbol.
      </p>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Updating password..." : "Update password"}
      </button>
    </form>
  );
}

function PasswordField({
  id,
  name,
  label,
  showPassword,
  onToggle,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  showPassword: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-[#111827]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          required
          className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 pr-12 text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={showPassword}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#6B7280] transition hover:bg-orange-50 hover:text-[#F97316] focus:outline-none focus:ring-4 focus:ring-orange-100"
        >
          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
