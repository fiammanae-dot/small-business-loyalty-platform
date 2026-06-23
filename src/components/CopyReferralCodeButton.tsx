"use client";

import { useState } from "react";

export function CopyReferralCodeButton({
  referralCode,
  brandColor,
}: {
  referralCode: string;
  brandColor: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-orange-100"
      style={{ backgroundColor: brandColor }}
    >
      {copied ? "Referral code copied" : "Copy Referral Code"}
    </button>
  );
}