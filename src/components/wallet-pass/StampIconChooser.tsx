"use client";

import type { CardDesignStampIcon } from "@/lib/card-design";
import { StampIconGraphic } from "@/components/design-studio/StampIconGraphic";

/**
 * The stamp icon choice - the icon drawn in the stamp picture on the wallet
 * pass and on the web card (the same artwork everywhere). Icons suggested for
 * the business type come first.
 */
export function StampIconChooser({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: CardDesignStampIcon; label: string; recommended: boolean }>;
  value: CardDesignStampIcon;
  onChange: (value: CardDesignStampIcon) => void;
}) {
  const sorted = [...options].sort((a, b) => Number(b.recommended) - Number(a.recommended));
  return (
    <div role="radiogroup" aria-label="Stamp icon" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {sorted.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-center gap-1 rounded-xl border bg-white px-1 py-2 transition hover:border-[var(--business-primary)] ${
              active ? "border-[var(--business-primary)] ring-2 ring-[var(--business-primary)]/25" : "border-[#E5E7EB]"
            }`}
          >
            <StampIconGraphic stampIcon={option.value} className="h-8 w-8" />
            <span className="w-full truncate text-center text-[10px] font-medium text-[#6B7280]">{option.label}</span>
            {option.recommended ? <span className="sr-only">Recommended</span> : null}
          </button>
        );
      })}
    </div>
  );
}
