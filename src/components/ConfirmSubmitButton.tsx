"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  message: string;
  children: ReactNode;
  className?: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
};

export function ConfirmSubmitButton({
  message,
  children,
  className,
  title = "Confirm action",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  disabled = false,
}: ConfirmSubmitButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function confirmAction() {
    setOpen(false);
    const form = buttonRef.current?.form;
    if (!form) return;
    form.requestSubmit();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-4 py-4 sm:items-center" role="presentation">
          <div className="w-full max-w-md rounded-md border border-[#E5E7EB] bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="confirm-submit-title">
            <h2 id="confirm-submit-title" className="text-lg font-semibold text-[#111827]">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">{message}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-md border border-[#E5E7EB] px-4 text-sm font-semibold text-[#111827]"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={confirmAction}
                className="min-h-11 rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
