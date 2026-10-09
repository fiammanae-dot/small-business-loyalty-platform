"use client";

import type { CardTheme } from "@prisma/client";
import { Check } from "lucide-react";
import type { CardDesignLayoutStyle } from "@/lib/card-design";
import { walletColourChoices, walletPassColors, type WalletPassBranding } from "@/lib/wallet-pass-view";

/**
 * The card colour choice. Apple and Google Wallet paint a pass with ONE solid
 * colour, so this is the whole of "card style": no gradients, patterns,
 * textures or fonts, because no wallet could show them.
 */
export function CardColourPicker<T extends CardDesignLayoutStyle | CardTheme>({
  value,
  onChange,
  branding,
  mode,
}: {
  value: T;
  onChange: (value: T) => void;
  branding: WalletPassBranding;
  /** Programs store the choice as a design layoutStyle; the cashback card as a cardTheme. */
  mode: "layoutStyle" | "cardTheme";
}) {
  return (
    <div role="radiogroup" aria-label="Card colour" className="grid gap-3 sm:grid-cols-2">
      {walletColourChoices.map((choice) => {
        const optionValue = (mode === "layoutStyle" ? choice.layoutStyle : choice.cardTheme) as T;
        const colors = walletPassColors({ cardTheme: choice.cardTheme, branding });
        const active = optionValue === value;
        return (
          <button
            key={choice.cardTheme}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(optionValue)}
            className={`flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-[var(--business-primary)] ${
              active ? "border-[var(--business-primary)] ring-2 ring-[var(--business-primary)]/25" : "border-[#E5E7EB]"
            }`}
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-black/10"
              style={{ backgroundColor: colors.background, color: colors.foreground }}
              aria-hidden="true"
            >
              {active ? <Check className="h-4 w-4" /> : null}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#111827]">{choice.label}</span>
              <span className="block text-xs text-[#6B7280]">{choice.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
