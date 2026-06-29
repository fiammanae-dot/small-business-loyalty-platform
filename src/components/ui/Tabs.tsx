"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "./utils";
import { interactiveFocusRing } from "./styles";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

export function Tabs({ items, defaultValue, label = "Sections" }: { items: TabItem[]; defaultValue?: string; label?: string }) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.id);
  const activeItem = items.find((item) => item.id === active) ?? items[0];

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto border-b border-[#E2E8F0] [scrollbar-gutter:stable]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeItem?.id === item.id}
            onClick={() => setActive(item.id)}
            className={cn(
              "min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition duration-200 ease-out active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0",
              interactiveFocusRing,
              activeItem?.id === item.id ? "business-border business-primary" : "border-transparent text-[#64748B] hover:text-[#1E293B]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem ? (
        <div role="tabpanel" className="mt-4">
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
