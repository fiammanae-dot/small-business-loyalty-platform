import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText, QrCode, Rocket, Users } from "lucide-react";
import { CTASection, MarketingCard, MarketingFrame, PageHero, SectionHeading } from "@/components/marketing/MarketingLayout";

const resources = [
  {
    title: "Loyalty program checklist",
    description: "Plan your reward, visit requirement, staff workflow, launch messaging, and customer handoff before going live.",
    icon: ClipboardCheck,
  },
  {
    title: "Customer retention guide",
    description: "Learn how small businesses can turn occasional buyers into regulars with simple, visible progress.",
    icon: Users,
  },
  {
    title: "Referral launch guide",
    description: "Use customer referrals without creating confusion at the counter or rewarding activity too early.",
    icon: FileText,
  },
  {
    title: "Staff scanner guide",
    description: "Train your team on card scanning, manual lookup, reward-ready states, and customer privacy basics.",
    icon: QrCode,
  },
  {
    title: "Pilot launch checklist",
    description: "A practical launch list for branches, staff accounts, customer cards, enrollment flow, and owner review.",
    icon: Rocket,
  },
];

export default function ResourcesPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Resources"
        title="Resources to help you launch loyalty the right way"
        description="Simple guides for planning, launching, and improving a loyalty program your customers will actually use."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <SectionHeading eyebrow="Guides" title="Useful launch material, without the fluff" description="These resources focus on the operational decisions most pilot businesses need to make." />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <MarketingCard key={resource.title} {...resource}>
                <Link href="/request-demo" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#EA580C]">
                  Discuss with LoyaltyBase <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </MarketingCard>
            ))}
          </div>
        </div>
      </section>

      <CTASection title="Launch with a cleaner plan from day one" description="Request Demo and map the right loyalty setup for your business type, team, and branch count." />
    </MarketingFrame>
  );
}
