import Link from "next/link";

const TABS = [
  { key: "wallet" as const, href: "/dashboard/wallet-broadcast", label: "Wallet message" },
  { key: "outbox" as const, href: "/dashboard/messages", label: "Outbox" },
];

/**
 * Shared tab bar that unifies the two customer-messaging surfaces under one
 * sidebar item: the Wallet push broadcast and the prepared-message outbox.
 */
export function MessagesTabs({ active }: { active: "wallet" | "outbox" }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-[#E7E9EE] bg-white p-1">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${isActive ? "business-button text-white" : "text-[#5A6070] hover:bg-[#F3F4F7]"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
