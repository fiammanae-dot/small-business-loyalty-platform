"use client";

import { useState } from "react";
import { STAMP_ICONS, DEFAULT_STAMP_EMOJI } from "@/lib/wallet/stamp-icons";

/**
 * Lets a business choose the icon drawn on its wallet card, one per stamp.
 *
 * The choice is limited to a curated set rather than free text: the artwork is
 * bundled with the app so every customer sees the same picture regardless of
 * phone, and an arbitrary character would have nothing to draw.
 */
export function StampIconPicker({ defaultEmoji }: { defaultEmoji?: string | null }) {
  const [selected, setSelected] = useState(defaultEmoji?.trim() || DEFAULT_STAMP_EMOJI);

  return (
    <div className="grid gap-3">
      <input type="hidden" name="stampEmoji" value={selected} />
      <div className="flex flex-wrap gap-2">
        {STAMP_ICONS.map((icon) => {
          const active = icon.emoji === selected;
          return (
            <button
              key={icon.emoji}
              type="button"
              onClick={() => setSelected(icon.emoji)}
              aria-pressed={active}
              title={icon.label}
              className={`flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-md border text-2xl transition ${
                active
                  ? "border-[#F97316] bg-[#FFF7ED] ring-2 ring-[#F97316]/30"
                  : "border-[#E5E7EB] bg-white hover:border-[#CBD5E1]"
              }`}
            >
              <span aria-hidden>{icon.emoji}</span>
              <span className="text-[9px] font-medium text-[#6B7280]">{icon.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-[#6B7280]">
        Customers see this on their wallet card. Collected stamps appear in colour, the rest in grey.
      </p>
    </div>
  );
}
