"use client";

import { useMemo, useState } from "react";

type CardShareActionsProps = {
  cardUrl: string;
  businessName: string;
  showCopy?: boolean;
  showWallet?: boolean;
  buttonColor?: string;
};

export function CardShareActions({
  cardUrl,
  businessName,
  showCopy = true,
  showWallet = true,
  buttonColor = "#F97316",
}: CardShareActionsProps) {
  const [message, setMessage] = useState("");
  const whatsappUrl = useMemo(() => {
    const text = `Hi, here is my loyalty card for ${businessName}:\n${cardUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [businessName, cardUrl]);

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

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {showCopy ? (
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827]"
          >
            Copy card link
          </button>
        ) : null}
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
            className="rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827]"
          >
            Add to Google Wallet
          </button>
        </div>
      ) : null}

      {message ? <p className="text-center text-sm font-medium text-[#F97316]">{message}</p> : null}
    </div>
  );
}
