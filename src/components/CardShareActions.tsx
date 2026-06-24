"use client";

import { useMemo, useState } from "react";
import { auditLoyaltyCardWhatsAppShare } from "@/app/card-share-actions";
import { formatUaePhoneForWhatsApp } from "@/lib/phone";

type CardShareActionsProps = {
  cardUrl: string;
  businessName: string;
  customerName?: string;
  recipientPhone?: string | null;
  auditMembershipUuid?: string;
  whatsappLabel?: string;
  showCopy?: boolean;
  showWallet?: boolean;
  buttonColor?: string;
  compact?: boolean;
};

export function CardShareActions({
  cardUrl,
  businessName,
  customerName = "Customer",
  recipientPhone,
  auditMembershipUuid,
  whatsappLabel = "Send via WhatsApp",
  showCopy = true,
  showWallet = true,
  buttonColor,
  compact = false,
}: CardShareActionsProps) {
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const whatsappPhone = useMemo(
    () => (recipientPhone ? formatUaePhoneForWhatsApp(recipientPhone) : null),
    [recipientPhone],
  );
  const shareText = useMemo(
    () =>
      `Hello ${customerName},\n\nWelcome to ${businessName}!\nYour Loyalty Card is ready.\n\nOpen your card here:\n${cardUrl}\n\nYou can save this message for future visits and present the QR code when earning stamps or redeeming rewards.\n\nThank you for joining our loyalty program.`,
    [businessName, cardUrl, customerName],
  );
  const whatsappUrl = useMemo(() => {
    if (!whatsappPhone) return null;
    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(shareText)}`;
  }, [shareText, whatsappPhone]);
  const disabledWhatsappLabel = recipientPhone ? "Invalid phone" : "No phone";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setMessage("Card link copied.");
    } catch {
      setMessage("Copy is not available in this browser.");
    }
  }

  function walletSoon() {
    setMessage("Wallet integration coming soon.");
  }

  async function shareViaWhatsApp() {
    if (!whatsappUrl) {
      setMessage(recipientPhone ? "Customer phone number is invalid." : "Customer phone number required.");
      return;
    }

    setSharing(true);
    try {
      if (auditMembershipUuid) {
        await auditLoyaltyCardWhatsAppShare(auditMembershipUuid);
      }
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setMessage("WhatsApp message prepared.");
    } catch {
      setMessage("WhatsApp share could not be logged. Please try again.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className={compact ? "" : "space-y-3"}>
      <div className={compact ? "flex items-center gap-2" : `grid gap-3 ${showCopy ? "sm:grid-cols-2" : ""}`}>
        {showCopy ? (
          <button
            type="button"
            onClick={copyLink}
            className={compact ? "rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] transition business-hover" : "rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition business-hover"}
          >
            Copy card link
          </button>
        ) : null}
        <button
          type="button"
          onClick={shareViaWhatsApp}
          disabled={!whatsappUrl || sharing}
          title={!whatsappUrl ? disabledWhatsappLabel : whatsappLabel}
          className={compact ? "whitespace-nowrap rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] transition business-hover disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500" : "rounded-md px-4 py-3 text-center text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 business-button"}
          style={!compact && whatsappUrl && !sharing && buttonColor ? { backgroundColor: buttonColor } : undefined}
        >
          {sharing ? "Preparing..." : whatsappUrl ? whatsappLabel : disabledWhatsappLabel}
        </button>
      </div>
      {!compact && !whatsappUrl ? (
        <p className="text-center text-sm font-medium text-[#9A3412]">
          {recipientPhone ? "Customer phone number is invalid." : "Customer phone number required."}
        </p>
      ) : null}

      {showWallet ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={walletSoon}
            className="rounded-md bg-black px-4 py-3 text-sm font-semibold text-white"
          >
            Add to Apple Wallet
          </button>
          <button
            type="button"
            onClick={walletSoon}
            className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition business-hover"
          >
            Add to Google Wallet
          </button>
        </div>
      ) : null}

      {!compact && message ? <p className="text-center text-sm font-medium business-text">{message}</p> : null}
    </div>
  );
}