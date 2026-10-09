"use client";

import { useState, type Ref } from "react";
import type { WalletPassView } from "@/lib/wallet-pass-view";
import { WalletPassCard, type WalletPlatform } from "@/components/wallet-pass/WalletPassCard";

/**
 * The live preview used wherever a business designs a card (Design Studio,
 * create-program wizard, cashback setup). It shows the card as each wallet
 * draws it, from the same view the real pass is built from.
 */
export function WalletPassPreview({
  view,
  defaultPlatform = "apple",
  note = "This is the card customers get - in Apple Wallet, in Google Wallet and on the web card link.",
  cardRef,
}: {
  view: WalletPassView;
  defaultPlatform?: WalletPlatform;
  note?: string | null;
  /** The element around the card, for image export. */
  cardRef?: Ref<HTMLDivElement>;
}) {
  const [platform, setPlatform] = useState<WalletPlatform>(defaultPlatform);
  return (
    <div className="grid justify-items-center gap-4">
      <div role="tablist" aria-label="Wallet" className="inline-flex rounded-full border border-[#E2E8F0] bg-[#F1F5F9] p-1">
        {(["apple", "google"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={platform === value}
            onClick={() => setPlatform(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              platform === value ? "bg-white text-[#111827] shadow-sm" : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            {value === "apple" ? "Apple Wallet" : "Google Wallet"}
          </button>
        ))}
      </div>
      <div ref={cardRef} className="flex w-full justify-center p-2">
        <WalletPassCard view={view} platform={platform} />
      </div>
      {note ? <p className="max-w-[340px] text-center text-xs leading-5 text-[#64748B]">{note}</p> : null}
    </div>
  );
}
