"use client";

import { useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

/**
 * One tap: opens WhatsApp with the message filled in, then submits the form
 * around it so the platform records the message as sent. The link opens from
 * the click itself (a user gesture), so browsers allow the new tab / app.
 */
export function SendOnWhatsAppButton({ link, disabledReason }: { link: string | null; disabledReason?: string }) {
  const [opened, setOpened] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  if (!link) {
    return (
      <span className="inline-flex h-10 items-center rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-xs font-semibold text-[#6B7280]" title={disabledReason}>
        {disabledReason ?? "No WhatsApp number"}
      </span>
    );
  }

  return (
    <button
      ref={button}
      type="submit"
      name="status"
      value="SENT"
      onClick={() => {
        if (!opened) {
          window.open(link, "_blank", "noopener");
          setOpened(true);
        }
      }}
      className="inline-flex h-10 items-center gap-2 rounded-md bg-[#25D366] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1EBE5D] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/30"
    >
      <MessageCircle aria-hidden="true" className="h-4 w-4" />
      Send on WhatsApp
    </button>
  );
}
