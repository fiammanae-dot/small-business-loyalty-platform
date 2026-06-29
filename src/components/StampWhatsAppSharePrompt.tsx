"use client";

import { useEffect, useMemo, useState } from "react";
import { auditLoyaltyCardWhatsAppShare } from "@/app/card-share-actions";
import { formatUaePhoneForWhatsApp } from "@/lib/phone";

type StampWhatsAppSharePromptProps = {
  cardUrl: string;
  businessName: string;
  customerName: string;
  recipientPhone: string | null;
  auditMembershipUuid: string;
  currentVisits: number;
  requiredVisits: number;
  autoOpen?: boolean;
};

export function StampWhatsAppSharePrompt({
  cardUrl,
  businessName,
  customerName,
  recipientPhone,
  auditMembershipUuid,
  currentVisits,
  requiredVisits,
  autoOpen = false,
}: StampWhatsAppSharePromptProps) {
  const [message, setMessage] = useState("");
  const [opened, setOpened] = useState(false);
  const whatsappPhone = useMemo(() => (recipientPhone ? formatUaePhoneForWhatsApp(recipientPhone) : null), [recipientPhone]);
  const whatsappMessage = useMemo(
    () =>
      `Thank you for visiting ${businessName}!\n\nYour loyalty card has just been updated.\n\nCurrent progress:\n${currentVisits} / ${requiredVisits}\n\nView your updated loyalty card here:\n${cardUrl}\n\nWe look forward to seeing you again!`,
    [businessName, cardUrl, currentVisits, requiredVisits],
  );
  const whatsappUrl = useMemo(() => {
    if (!whatsappPhone) return null;
    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`;
  }, [whatsappMessage, whatsappPhone]);

  async function openWhatsApp() {
    if (!whatsappUrl) {
      setMessage("Stamp issued. Customer phone number is required before WhatsApp can be opened.");
      return;
    }

    try {
      await auditLoyaltyCardWhatsAppShare(auditMembershipUuid);
      const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        setMessage("Stamp issued. WhatsApp could not be opened automatically. Use the button below to open it.");
        return;
      }
      setMessage("Stamp issued. WhatsApp message prepared.");
    } catch {
      setMessage("Stamp issued. WhatsApp could not be opened automatically.");
    }
  }

  useEffect(() => {
    if (!autoOpen || opened) return;
    setOpened(true);
    void openWhatsApp();
  }, [autoOpen, opened]);

  return (
    <div className="rounded-md border border-emerald-200 bg-white p-3 text-sm text-emerald-900">
      <p className="font-semibold">Send updated card via WhatsApp</p>
      <p className="mt-1 text-emerald-800">
        {customerName}'s card is updated to {currentVisits} / {requiredVisits} visits.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openWhatsApp}
          disabled={!whatsappUrl}
          className="rounded-md business-button px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
        >
          Open WhatsApp
        </button>
        <a href={cardUrl} target="_blank" rel="noreferrer" className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#111827]">
          View card
        </a>
      </div>
      {message ? <p className="mt-2 text-sm font-medium">{message}</p> : null}
    </div>
  );
}
