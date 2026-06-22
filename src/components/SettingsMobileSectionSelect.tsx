"use client";

import { useRouter } from "next/navigation";

type SettingsTab = {
  tab: string;
  mobileLabel: string;
};

export function SettingsMobileSectionSelect({
  tabs,
  activeTab,
}: {
  tabs: SettingsTab[];
  activeTab: string;
}) {
  const router = useRouter();

  return (
    <section className="max-w-full rounded-md border border-[#E5E7EB] bg-white p-3 md:hidden" aria-label="Business settings section selector">
      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Settings section</span>
        <select
          value={activeTab}
          onChange={(event) => router.push(`/dashboard/settings?tab=${event.target.value}`)}
          className="h-11 w-full max-w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] outline-none business-ring focus:ring-0 business-border"
        >
          {tabs.map((item) => (
            <option key={item.tab} value={item.tab}>
              {item.mobileLabel}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
