import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { DataTableHeadCell } from "./DataTable";

export function SortableHeadCell({
  href,
  active,
  direction = "desc",
  align,
  className,
  children,
}: {
  href: string;
  active: boolean;
  direction?: "asc" | "desc";
  align?: "right";
  className?: string;
  children: ReactNode;
}) {
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <DataTableHeadCell
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
      className={className}
    >
      <Link
        href={href}
        className={`inline-flex items-center gap-1 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
          align === "right" ? "w-full justify-end" : ""
        } ${active ? "text-[var(--accent-deep)]" : "hover:text-[#171A21]"}`}
      >
        {children}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </DataTableHeadCell>
  );
}
