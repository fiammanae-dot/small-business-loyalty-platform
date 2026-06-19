"use client";

import { Copy, KeyRound, Mail, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import type { StaffPasswordResetState } from "@/app/dashboard/actions";
import { resetStaffPasswordAction } from "@/app/dashboard/actions";

const initialState: StaffPasswordResetState = {};

export function StaffPasswordResetAction({
  staffUserId,
  staffName,
  csrfToken,
}: {
  staffUserId: number;
  staffName: string;
  csrfToken: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(resetStaffPasswordAction, initialState);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  useEffect(() => {
    if (state.temporaryPassword) {
      toast.success("Temporary password generated. Share it securely.");
    }
  }, [state.temporaryPassword]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-[#F97316]"
      >
        Reset Password
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="w-full max-w-lg rounded-md border border-[#E5E7EB] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">Staff security</p>
                <h3 className="mt-1 text-xl font-semibold text-[#111827]">Reset password</h3>
                <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                  Reset access for {staffName}. The temporary password is shown once, active sessions are logged out, and the user must create a new password at next login.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close reset password modal"
                className="rounded-md p-2 text-[#6B7280] transition hover:bg-orange-50 hover:text-[#F97316]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <form action={formAction} className="rounded-md border border-[#E5E7EB] bg-orange-50/40 p-4">
                <input type="hidden" name="csrfToken" value={csrfToken} />
                <input type="hidden" name="staffUserId" value={staffUserId} />
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#F97316]">
                    <KeyRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#111827]">Generate secure temporary password</p>
                    <p className="mt-1 text-sm leading-5 text-[#6B7280]">
                      Recommended. Store only the hash and display the temporary password one time.
                    </p>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-4 h-10 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? "Resetting..." : "Generate temporary password"}
                </button>
              </form>

              <div className="rounded-md border border-dashed border-[#E5E7EB] bg-white p-4 opacity-75">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#F9FAFB] text-[#6B7280]">
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-[#111827]">Send password reset email</p>
                    <p className="mt-1 text-sm leading-5 text-[#6B7280]">
                      Email delivery is not configured yet, so this option is unavailable.
                    </p>
                  </div>
                </div>
                <button type="button" disabled className="mt-4 h-10 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#6B7280]">
                  Email option unavailable
                </button>
              </div>
            </div>

            {state.error ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            ) : null}

            {state.temporaryPassword ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Temporary password generated for {state.targetName}</p>
                <div className="mt-3 flex flex-col gap-2 rounded-md bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <code className="break-all text-sm font-semibold text-[#111827]">{state.temporaryPassword}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(state.temporaryPassword ?? "");
                      toast.success("Temporary password copied.");
                    }}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#F97316]"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy
                  </button>
                </div>
                <p className="mt-3 text-xs leading-5 text-emerald-800">
                  This password is not stored in plain text and will disappear when this modal is closed or the page is refreshed.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
