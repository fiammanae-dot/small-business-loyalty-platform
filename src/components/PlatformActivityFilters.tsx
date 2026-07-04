"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const selectClasses =
  "h-11 min-w-0 rounded-lg border border-[var(--medium-gray)] bg-white px-3 text-sm text-[#3D4352] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:h-10";

export function PlatformActivityFilters({ activity, date }: { activity: string; date: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className={`grid grid-cols-2 gap-2 transition-opacity sm:flex sm:items-center ${isPending ? "opacity-60" : ""}`}>
      <select
        aria-label="Filter activity by type"
        defaultValue={activity}
        onChange={(event) => updateParam("activity", event.target.value)}
        className={selectClasses}
      >
        <option value="all">All Activity</option>
        <option value="alerts">Alerts</option>
        <option value="invoices">Invoices</option>
        <option value="users">Users</option>
        <option value="subscriptions">Subscriptions</option>
      </select>
      <select
        aria-label="Filter activity by date range"
        defaultValue={date}
        onChange={(event) => updateParam("date", event.target.value)}
        className={selectClasses}
      >
        <option value="24h">24 Hours</option>
        <option value="7d">7 Days</option>
        <option value="30d">30 Days</option>
      </select>
    </div>
  );
}
