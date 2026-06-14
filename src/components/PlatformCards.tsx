import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type PlatformCard = {
  title: string;
  href: string;
  description: string;
  icon?: LucideIcon;
};

export function PlatformCards({ cards }: { cards: PlatformCard[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="rounded-md border border-[#E5E7EB] bg-white p-5 transition hover:border-[#F97316] hover:shadow-sm"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
            {card.icon ? <card.icon className="h-6 w-6" aria-hidden="true" /> : null}
          </div>
          <h2 className="mt-4 text-base font-semibold text-[#111827]">{card.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">{card.description}</p>
        </Link>
      ))}
    </section>
  );
}
