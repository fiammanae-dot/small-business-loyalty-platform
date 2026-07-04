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
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="rounded-xl border border-[#E7E9EE] bg-white p-5 shadow-[0_1px_2px_rgba(15,18,25,0.04)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#F4C7AE] hover:shadow-[0_6px_18px_rgba(15,18,25,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FBEFE8] text-[#C24E1E]">
            {card.icon ? <card.icon className="h-5 w-5" aria-hidden="true" /> : null}
          </div>
          <h2 className="mt-4 text-base font-bold tracking-tight text-[#171A21]">{card.title}</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#7A8091]">{card.description}</p>
        </Link>
      ))}
    </section>
  );
}
