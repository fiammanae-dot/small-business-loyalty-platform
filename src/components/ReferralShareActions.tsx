"use client";

import { useMemo, useState } from "react";

export function ReferralShareActions({
  referralUrl,
  businessName,
  buttonColor = "#F97316",
}: {
  referralUrl: string;
  businessName: string;
  buttonColor?: string;
}) {
  const [message, setMessage] = useState("");
  const whatsappUrl = useMemo(() => {
    const text = `Join ${businessName}'s loyalty program with my referral link:\n${referralUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [businessName, referralUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setMessage("Referral link copied.");
    } catch {
      setMessage("Copy is not available in this browser.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827]"
        >
          Copy Link
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md px-4 py-3 text-center text-sm font-semibold text-white"
          style={{ backgroundColor: buttonColor }}
        >
          Share via WhatsApp
        </a>
      </div>
      {message ? <p className="text-center text-sm font-medium text-[#F97316]">{message}</p> : null}
    </div>
  );
}
