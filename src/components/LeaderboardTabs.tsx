"use client";

import { useState } from "react";

export type LeaderboardDataset = {
  key: string;
  label: string;
  valueLabel: string;
  rows: Array<{ businessId: number; businessName: string; value: number }>;
};

export function LeaderboardTabs({ datasets }: { datasets: LeaderboardDataset[] }) {
  const [activeKey, setActiveKey] = useState(datasets[0]?.key ?? "");
  const active = datasets.find((dataset) => dataset.key === activeKey) ?? datasets[0];

  if (!active) {
    return null;
  }

  const max = Math.max(1, ...active.rows.map((row) => row.value));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold tracking-tight text-[#171A21]">Business leaderboard</h2>
        <div role="tablist" aria-label="Leaderboard metric" className="flex flex-wrap gap-1.5">
          {datasets.map((dataset) => {
            const isActive = dataset.key === active.key;
            return (
              <button
                key={dataset.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveKey(dataset.key)}
                className={`inline-flex min-h-8 items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                  isActive
                    ? "border-[var(--light-orange)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                    : "border-[var(--medium-gray)] bg-white text-[#7A8091] hover:border-[var(--light-orange)] hover:text-[var(--accent-deep)]"
                }`}
              >
                {dataset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-2.5" role="tabpanel" aria-label={active.label}>
        {active.rows.map((row, index) => (
          <div key={`${row.businessId}-${index}`} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
            <span className={`font-bold tabular-nums ${index < 3 ? "text-[var(--accent-deep)]" : "text-[#9AA0AD]"}`}>{index + 1}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#171A21]">{row.businessName}</p>
              <div className="mt-1 h-1 rounded-full bg-[var(--light-gray)]">
                <div
                  className={`h-1 rounded-full ${index < 3 ? "bg-[var(--accent)]" : "bg-[var(--light-orange)]"}`}
                  style={{ width: `${Math.max(2, Math.round((row.value / max) * 100))}%` }}
                />
              </div>
            </div>
            <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-[#3D4352]">
              {row.value.toLocaleString("en-US")} <span className="font-medium text-[#7A8091]">{active.valueLabel}</span>
            </span>
          </div>
        ))}
        {active.rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#D8DBE2] bg-[var(--app-canvas)] p-4 text-sm text-[#7A8091]">No data available yet.</p>
        ) : null}
      </div>
    </div>
  );
}
