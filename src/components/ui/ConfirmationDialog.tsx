"use client";

import type { CSSProperties, ReactNode } from "react";
import { useId, useState } from "react";
import { Button } from "./Button";
import { cn } from "./utils";

export type ConfirmationDialogTheme = {
  background: string;
  foreground: string;
  hoverBackground?: string;
  focusRing?: string;
  disabledBackground?: string;
};

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  danger = false,
  theme,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  danger?: boolean;
  theme?: ConfirmationDialogTheme;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const themedConfirm = theme && !danger;
  const themeStyle = themedConfirm
    ? ({
        "--confirmation-background": theme.background,
        "--confirmation-foreground": theme.foreground,
        "--confirmation-hover-background": theme.hoverBackground ?? theme.background,
        "--confirmation-focus-ring": theme.focusRing ?? theme.background,
        "--confirmation-disabled-background": theme.disabledBackground ?? theme.background,
      } as CSSProperties)
    : undefined;

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl"
          >
            <h2 id={titleId} className="text-lg font-semibold text-[#0F172A]">
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#475569]">
              {description}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
              <Button
                variant={danger ? "danger" : "primary"}
                onClick={() => {
                  onConfirm();
                  setOpen(false);
                }}
                style={themeStyle}
                className={cn(
                  danger && "border-[#B91C1C]",
                  themedConfirm &&
                    "border-transparent text-[var(--confirmation-foreground)] shadow-sm [background:var(--confirmation-background)] hover:[background:var(--confirmation-hover-background)] hover:brightness-95 focus-visible:ring-[var(--confirmation-focus-ring)] disabled:[background:var(--confirmation-disabled-background)]",
                )}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
