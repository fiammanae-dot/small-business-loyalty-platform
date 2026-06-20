"use client";

import { useRouter } from "next/navigation";

export function MobileTabSelector({
  label,
  activeValue,
  options,
  basePath,
  paramName = "tab",
}: {
  label: string;
  activeValue: string;
  options: Array<{ value: string; label: string }>;
  basePath: string;
  paramName?: string;
}) {
  const router = useRouter();

  return (
    <label className="block max-w-full min-w-0 md:hidden">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</span>
      <select
        value={activeValue}
        onChange={(event) => {
          const query = new URLSearchParams();
          query.set(paramName, event.target.value);
          router.push(`${basePath}?${query.toString()}`);
        }}
        className="min-h-11 w-full max-w-full min-w-0 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] shadow-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
