"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState, type ReactNode } from "react";

export function MobileFilterDrawer({
  children,
  activeCount = 0,
  title = "Filters",
}: {
  children: ReactNode;
  activeCount?: number;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-[#F97316] hover:text-[#F97316]"
          aria-expanded={open}
        >
          <SlidersHorizontal className="h-4 w-4 text-[#F97316]" aria-hidden="true" />
          {title}
          {activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      <div className="hidden md:block">{children}</div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <button
            type="button"
            className="absolute inset-0 bg-[#111827]/45"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-4">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{title}</p>
                {activeCount > 0 ? <p className="text-xs text-[#6B7280]">{activeCount} active</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#E5E7EB] text-[#6B7280]"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[calc(82vh-3.5rem)] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
