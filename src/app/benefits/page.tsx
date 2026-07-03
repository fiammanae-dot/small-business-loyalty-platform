import { BarChart3, Gift, Layers3, QrCode, ScanLine, Smartphone, Trophy, Users, WalletCards } from "lucide-react";
import { CTASection, MarketingCard, MarketingFrame, PageHero, SectionHeading } from "@/components/marketing/MarketingLayout";

const benefits = [
  {
    title: "Digital loyalty cards",
    description: "Customers receive a branded loyalty card link that opens on any mobile browser and stays easy to share.",
    icon: WalletCards,
  },
  {
    title: "QR scanning",
    description: "Staff scan cards at the counter to add visits, find customers, or redeem rewards through a secure workflow.",
    icon: QrCode,
  },
  {
    title: "Rewards",
    description: "Create visit-based programs with clear progress, reward-ready states, and simple redemption moments.",
    icon: Gift,
  },
  {
    title: "Customer tiers",
    description: "Recognize loyal regulars with tier visibility and benefits that help customers feel known.",
    icon: Trophy,
  },
  {
    title: "Referrals",
    description: "Let happy customers invite friends while keeping reward qualification tied to real visits.",
    icon: Users,
  },
  {
    title: "Business dashboard",
    description: "Track customers, programs, referrals, alerts, plan usage, and daily operations from one workspace.",
    icon: BarChart3,
  },
  {
    title: "No customer app required",
    description: "Customers do not need to download an app. They open their card, show the QR code, and keep earning.",
    icon: Smartphone,
  },
  {
    title: "Reports",
    description: "Review loyalty activity, reward readiness, customer growth, and exports where supported by your plan.",
    icon: Layers3,
  },
  {
    title: "Mobile browser cards",
    description: "Customers can use secure browser-based loyalty cards today without waiting for wallet pass support.",
    icon: ScanLine,
  },
];

export default function BenefitsPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Product"
        title="Everything local businesses need to grow repeat customers"
        description="Loyalty Card UAE brings digital cards, QR scanning, referrals, tiers, rewards, and operational reporting into one clean platform."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <SectionHeading
            eyebrow="What you get"
            title="A loyalty system customers understand instantly"
            description="The experience is simple for customers and controlled for owners, managers, and staff."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <MarketingCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#EEF2F6] bg-[#FAFBFC] px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-3">
          {[
            ["For customers", "Open the card, show the QR code, track progress, and see rewards without installing anything."],
            ["For staff", "Scan, add visits, and redeem rewards with fewer screens and less guesswork at checkout."],
            ["For owners", "See what is happening across customers, branches, programs, referrals, and plan limits."],
          ].map(([title, description]) => (
            <article key={title} className="rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#08111F]">{title}</h2>
              <p className="mt-4 text-sm leading-7 text-[#607089]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <CTASection />
    </MarketingFrame>
  );
}
