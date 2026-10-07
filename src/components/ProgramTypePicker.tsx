import Link from "next/link";
import { ArrowRight, Crown, Stamp, Trophy, Wallet } from "lucide-react";

/**
 * The entry point for creating a program. A business picks one of four program
 * types, each with its own setup flow:
 *  - Stamp / Membership create a loyalty-program row through ProgramCreateWizard
 *    (reached here with ?type=stamp / ?type=membership).
 *  - Cashback / Tier are business-wide features, configured through their own
 *    setup. Until their dedicated flows land, their cards point at the matching
 *    Settings section so nothing is a dead end.
 */
type ProgramTypeCard = {
  key: string;
  href: string;
  title: string;
  description: string;
  Icon: typeof Stamp;
};

const TYPES: ProgramTypeCard[] = [
  {
    key: "stamp",
    href: "/dashboard/programs/new?type=stamp",
    title: "Stamp card",
    description: "Customers collect a stamp each visit and unlock a reward when the card is full.",
    Icon: Stamp,
  },
  {
    key: "membership",
    href: "/dashboard/programs/new?type=membership",
    title: "Membership",
    description: "Customers prepay for a set number of sessions. Each visit counts one down.",
    Icon: Crown,
  },
  {
    key: "cashback",
    href: "/dashboard/programs/new?type=cashback",
    title: "Cashback",
    description: "Customers earn a percentage of what they spend back as wallet balance to redeem later.",
    Icon: Wallet,
  },
  {
    key: "tier",
    href: "/dashboard/programs/new?type=tier",
    title: "Tiers",
    description: "Customers climb Bronze, Silver, Gold and VIP by visits, unlocking better perks.",
    Icon: Trophy,
  },
];

export function ProgramTypePicker() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {TYPES.map(({ key, href, title, description, Icon }) => (
        <Link
          key={key}
          href={href}
          className="group flex items-start gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5 transition hover:border-[var(--business-primary)] hover:shadow-sm"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg business-bg-soft business-primary-strong">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-base font-bold text-[#111827]">{title}</span>
              <ArrowRight
                className="h-4 w-4 text-[#94A3B8] transition group-hover:translate-x-0.5 group-hover:text-[var(--business-primary)]"
                aria-hidden
              />
            </span>
            <span className="mt-1 block text-sm text-[#6B7280]">{description}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
