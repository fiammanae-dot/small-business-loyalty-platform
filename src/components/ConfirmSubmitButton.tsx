"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { ConfirmationDialog } from "@/components/ui";

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
  function confirmAction() {
    const form = buttonRef.current?.form;
    if (!form) return;
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
