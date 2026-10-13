import { CheckCircle2 } from "lucide-react";
import { CTASection, MarketingFrame, PageHero, PricingPlanCards, SectionHeading, includedInEveryPlan } from "@/components/marketing/MarketingLayout";

export default function PricingPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Pricing"
        title="Simple pricing for small businesses and growing branches"
        description="Every plan has every feature. Pick the one that matches how many branches, programs and staff you have, and move up when you grow."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <PricingPlanCards />
        </div>
      </section>

      <section className="border-y border-[#EEF2F6] bg-[#FAFBFC] px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <SectionHeading
            eyebrow="Included in every plan"
            title="Nothing held back on the smaller plans"
            description="Starter, Growth and Multi Branch all include the full platform. The only difference is the number of branches, programs and staff logins."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {includedInEveryPlan.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 text-sm font-bold text-[#111827] shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-[#F26A21]" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection title="Not sure which plan fits?" description="Request a demo and we will set up a trial card for your business and recommend a plan based on your branches and team." />
    </MarketingFrame>
  );
}
