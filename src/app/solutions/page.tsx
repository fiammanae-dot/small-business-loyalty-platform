import { Car, Coffee, Droplets, Scissors, ShoppingBag, Sparkles, Store, Utensils } from "lucide-react";
import { CTASection, MarketingCard, MarketingFrame, PageHero, SectionHeading } from "@/components/marketing/MarketingLayout";

const solutions = [
  {
    title: "Coffee shops",
    description: "Turn daily coffee visits into a visible stamp journey with QR cards, reward-ready moments, and fast staff scanning.",
    icon: Coffee,
  },
  {
    title: "Restaurants",
    description: "Encourage repeat dining with simple visit rewards and customer-friendly digital cards that work at the table or counter.",
    icon: Utensils,
  },
  {
    title: "Barbershops",
    description: "Track loyal clients across haircuts, beard trims, and services while keeping the experience quick at checkout.",
    icon: Scissors,
  },
  {
    title: "Beauty salons",
    description: "Create polished loyalty journeys for treatments, packages, referrals, and premium regulars.",
    icon: Sparkles,
  },
  {
    title: "Car washes",
    description: "Reward frequent washes with a card customers can keep on their phone and show every visit.",
    icon: Droplets,
  },
  {
    title: "Car care centers",
    description: "Support recurring services, branch workflows, and clear customer progress for maintenance-based businesses.",
    icon: Car,
  },
  {
    title: "Retail stores",
    description: "Bring shoppers back with digital loyalty cards, referrals, and tiers without requiring a customer app.",
    icon: ShoppingBag,
  },
  {
    title: "Local services",
    description: "Use LoyaltyBase for gyms, laundries, clinics, workshops, and service teams that depend on repeat customers.",
    icon: Store,
  },
];

export default function SolutionsPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Solutions"
        title="Built for the businesses your customers visit every week"
        description="LoyaltyBase adapts to high-frequency local businesses where staff need speed and customers need simplicity."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <SectionHeading
            eyebrow="Industries"
            title="Practical loyalty for real-world counters, branches, and teams"
            description="Each workflow is built around fast QR scanning, clear rewards, and customer cards that work on any phone."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {solutions.map((solution) => (
              <MarketingCard key={solution.title} {...solution} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#EEF2F6] bg-[#FAFBFC] px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-[1180px] gap-5 lg:grid-cols-3">
          {[
            ["Fast checkout", "Cashiers can scan and act quickly, even during busy hours."],
            ["No app friction", "Customers join and return with a simple digital card link."],
            ["Branch visibility", "Owners can understand customer activity across locations when their plan supports branches."],
          ].map(([title, description]) => (
            <article key={title} className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#08111F]">{title}</h2>
              <p className="mt-4 text-sm leading-7 text-[#607089]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <CTASection title="Bring modern loyalty to your local business" />
    </MarketingFrame>
  );
}
