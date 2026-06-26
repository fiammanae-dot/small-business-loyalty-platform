import type { ReactNode } from "react";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span title={label} aria-label={label}>
      {children}
    </span>
  );
}

export function HelperText({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-5 text-[#64748B]">{children}</p>;
}
