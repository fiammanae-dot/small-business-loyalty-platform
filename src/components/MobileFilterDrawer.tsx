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
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--medium-gray)] bg-white px-4 py-2 text-sm font-semibold text-[#171A21] shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          aria-expanded={open}
        >
          <SlidersHorizontal className="h-4 w-4 text-[var(--accent-deep)]" aria-hidden="true" />
          {title}
          {activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      <div className="hidden md:block">{children}</div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <button
            type="button"
            className="absolute inset-0 bg-[#171A21]/45"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-[var(--medium-gray)] bg-white px-4">
              <div>
                <p className="text-sm font-semibold text-[#171A21]">{title}</p>
                {activeCount > 0 ? <p className="text-xs text-[#7A8091]">{activeCount} active</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--medium-gray)] text-[#7A8091] transition hover:bg-[var(--light-gray)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
