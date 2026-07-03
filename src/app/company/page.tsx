import { Building2, Globe2, LockKeyhole, Smartphone, Target, Users } from "lucide-react";
import { CTASection, MarketingCard, MarketingFrame, PageHero, SectionHeading } from "@/components/marketing/MarketingLayout";

const principles = [
  {
    title: "Built for local business growth",
    description: "Loyalty Card UAE focuses on the businesses customers visit every week: cafes, salons, restaurants, car care, retail, and services.",
    icon: Target,
  },
  {
    title: "UAE and GCC focus",
    description: "The product is shaped for regional small and medium businesses that need simple, mobile-first customer experiences.",
    icon: Globe2,
  },
  {
    title: "No-app customer experience",
    description: "Customers should not need another app. A secure browser card keeps the loyalty journey lightweight and immediate.",
    icon: Smartphone,
  },
  {
    title: "Enterprise architecture",
    description: "The platform is designed as secure multi-tenant SaaS with role-based workspaces and operational auditability.",
    icon: LockKeyhole,
  },
  {
    title: "Practical for teams",
    description: "Owners, managers, and staff each get workflows that match how loyalty happens at the counter.",
    icon: Users,
  },
  {
    title: "Simple to launch",
    description: "Businesses can start with one branch and one program, then expand into referrals, tiers, reports, and multi-branch operations.",
    icon: Building2,
  },
];

export default function CompanyPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Company"
        title="Loyalty Card UAE is built for local business growth"
        description="We help local businesses replace fragile paper cards and app-heavy loyalty ideas with secure digital cards, QR scanning, and clear repeat-customer operations."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <SectionHeading
            eyebrow="Mission"
            title="Make loyalty simple enough for customers and strong enough for operators"
            description="The best loyalty program is the one customers remember to use and staff can run without slowing down."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {principles.map((principle) => (
              <MarketingCard key={principle.title} {...principle} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#EEF2F6] bg-[#FAFBFC] px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[980px] rounded-[36px] border border-[#E5E7EB] bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#EA580C]">Vision</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#08111F] sm:text-5xl">A loyalty layer for every local business</h2>
          <p className="mt-5 text-lg leading-8 text-[#607089]">
            We believe local businesses deserve software that feels premium, works on the devices they already use, and helps them build stronger customer relationships without adding operational complexity.
          </p>
        </div>
      </section>

      <CTASection />
    </MarketingFrame>
  );
}
