"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export function MobileAccordionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <section className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-left text-sm font-semibold text-[#111827] shadow-sm"
        >
          <span>{title}</span>
          <ChevronDown className={`h-4 w-4 text-[#6B7280] transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {open ? <div className="mt-3">{children}</div> : null}
      </section>
      <div className="hidden md:block">{children}</div>
    </>
  );
}
