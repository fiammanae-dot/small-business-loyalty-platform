"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { ConfirmationDialog, type ConfirmationDialogTheme } from "@/components/ui";

type ConfirmSubmitButtonProps = {
  message: string;
  children: ReactNode;
  className?: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  confirmationTheme?: ConfirmationDialogTheme;
  /**
   * Optional form field to set just before submitting. Lets several confirm
   * buttons share ONE form (and one set of inputs) while each submits a
   * different value - e.g. a plain "Use Session" button and a
   * "Use Session & Share" button that post the same treatment field but set
   * shareAfterStamp differently. This keeps a single treatment picker instead
   * of one per button.
   */
  submitFieldName?: string;
  submitFieldValue?: string;
};

export function ConfirmSubmitButton({
  message,
  children,
  className,
  title = "Confirm action",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  disabled = false,
  confirmationTheme,
  submitFieldName,
  submitFieldValue = "",
}: ConfirmSubmitButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  function confirmAction() {
    const form = buttonRef.current?.form;
    if (!form) return;
    if (submitFieldName) {
      const field = form.elements.namedItem(submitFieldName);
      if (field instanceof HTMLInputElement) {
        field.value = submitFieldValue;
      }
    }
    form.requestSubmit();
  }

  return (
    <>
      <ConfirmationDialog
        title={title}
        description={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={confirmAction}
        danger={confirmLabel.toLowerCase().includes("disable") || confirmLabel.toLowerCase().includes("delete")}
        theme={confirmationTheme}
        trigger={
          <button
            ref={buttonRef}
            type="button"
            disabled={disabled}
            className={className}
          >
            {children}
          </button>
        }
      />
    </>
  );
}
