import { CheckCircle2 } from "lucide-react";
import { CTASection, MarketingFrame, PageHero, PricingPlanCards, SectionHeading } from "@/components/marketing/MarketingLayout";

const included = ["Referrals", "Customer tiers", "Reports", "CSV exports", "Branding"];

export default function PricingPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Pricing"
        title="Simple pricing for small businesses and growing branches"
        description="Choose the plan that matches your branch count, program count, and stage of growth. No unsupported features, no confusing bundles."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <PricingPlanCards />
        </div>
      </section>

      <section className="border-y border-[#EEF2F6] bg-[#FAFBFC] px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <SectionHeading
            eyebrow="Included"
            title="The essentials every pilot business needs"
            description="These capabilities are part of the LoyaltyBase product direction and appear across the official plan structure."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {included.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 text-sm font-bold text-[#111827] shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection title="Need help choosing a plan?" description="Request Demo and we will map the right plan to your branch count, program count, and launch goals." />
    </MarketingFrame>
  );
}
