"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";

export function ReferralShareActions({
  referralUrl,
  businessName,
  buttonColor,
}: {
  referralUrl: string;
  businessName: string;
  buttonColor?: string;
}) {
  const [message, setMessage] = useState("");
  const t = useT();
  const whatsappUrl = useMemo(() => {
    const text = t("referralPanel.shareMessage", { business: businessName, url: referralUrl });
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [businessName, referralUrl, t]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setMessage(t("referral.linkCopied"));
    } catch {
      setMessage(t("share.copyUnavailable"));
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition business-hover"
        >
          {t("referralPanel.copyLink")}
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md px-4 py-3 text-center text-sm font-semibold business-button"
          style={buttonColor ? { backgroundColor: buttonColor } : undefined}
        >
          {t("share.whatsapp")}
        </a>
      </div>
      {message ? <p className="text-center text-sm font-medium business-text">{message}</p> : null}
    </div>
  );
}
