"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

export function ReferralInviteActions({
  referralUrl,
  businessName,
  referrerName,
  brandColor,
}: {
  referralUrl: string;
  businessName: string;
  referrerName: string;
  brandColor: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const message = t("referral.inviteMessage", { referrer: referrerName || t("referral.yourReferrer"), business: businessName, url: referralUrl });
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex min-h-11 items-center justify-center rounded-md px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-orange-100"
        style={{ backgroundColor: brandColor }}
      >
        {copied ? t("referral.linkCopied") : t("referral.copyLink")}
      </button>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F9FAFB]"
      >
        {t("referral.shareWhatsapp")}
      </a>
    </div>
  );
}