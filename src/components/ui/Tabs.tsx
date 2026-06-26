"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "./utils";

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
      <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto border-b border-[#E2E8F0]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeItem?.id === item.id}
            onClick={() => setActive(item.id)}
            className={cn(
              "min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2",
              activeItem?.id === item.id ? "border-[#F97316] text-[#EA580C]" : "border-transparent text-[#64748B] hover:text-[#1E293B]",
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
