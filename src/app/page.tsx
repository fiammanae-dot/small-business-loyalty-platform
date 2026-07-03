import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import HeroShowcase from "@/app/_components/HeroShowcase";
import { MotionItem, MotionReveal, MotionStagger } from "@/components/HomepageMotion";
import { CTASection, MarketingCard, MarketingFooter, PricingPlanCards, PublicHeader, SectionHeading } from "@/components/marketing/MarketingLayout";

const logos = ["BIRCH COFFEE", "Proper Pizza", "ELEVATE FITNESS", "LUNA SALON", "FOUNDRY CLOTHING", "& more"];

const proofItems = [
  { label: "Secure platform", value: "Encrypted", icon: ShieldCheck },
  { label: "Uptime", value: "99.9%", icon: CheckCircle2 },
  { label: "Local businesses", value: "Built for", icon: Store },
  { label: "Average rating", value: "4.9/5", icon: Star },
];

const benefits = [
  { title: "Digital loyalty cards", description: "Customers open a branded card instantly from a secure link. No app download, no plastic cards.", icon: WalletCards },
  { title: "QR scanner workflow", description: "Staff scan customer cards, add visits, and redeem rewards with a cashier-friendly flow.", icon: ScanLine },
  { title: "Referrals and tiers", description: "Reward customers who bring friends and recognize your most loyal regulars with clear tiers.", icon: Users },
];

const solutions = [
  "Coffee shops",
  "Restaurants",
  "Barbershops",
  "Beauty salons",
  "Car care centers",
  "Retail stores",
];

const faqs = [
  ["Do customers need an app?", "No. Customers use a mobile-friendly digital card that opens in the browser."],
  ["How does scanning work?", "Your team scans the card QR code, then Loyalty Card UAE opens the secure customer action flow."],
  ["Can branches use it?", "Yes. Plans include branch limits and staff workflows designed for local operations."],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F6F8] p-0 text-[#0F172A] sm:p-2">
      <div className="min-h-screen overflow-hidden rounded-none border border-[#E5E7EB] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:rounded-[28px]">
        <PublicHeader />
        <HeroSection />
        <TrustedStrip />
        <BenefitsOverview />
        <IndustrySolutions />
        <PricingTeaser />
        <FaqTeaser />
        <CTASection />
        <MarketingFooter />
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(255,122,24,0.12),transparent_28%),radial-gradient(circle_at_78%_42%,rgba(255,122,24,0.10),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-[1720px] gap-10 px-5 pb-10 pt-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-16 lg:pb-8 lg:pt-20">
        <div className="max-w-[740px]">
          <MotionReveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FED7AA] bg-white px-4 py-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#F97316] shadow-sm">
              <Sparkles className="h-4 w-4 fill-[#F97316]" aria-hidden="true" />
              Built for small business
            </span>

            <h1 className="mt-9 text-[56px] font-extrabold leading-[0.94] tracking-[-0.075em] text-[#08111F] sm:text-[76px] lg:text-[92px] xl:text-[104px]">
              Loyal customers.
              <br />
              Real, repeat <span className="text-[#FF5A0A]">growth.</span>
            </h1>

            <p className="mt-7 max-w-[620px] text-[21px] leading-[1.45] tracking-[-0.02em] text-[#607089]">
              Launch a modern loyalty program in minutes. Reward more visits. Grow your business.
            </p>

            <MotionStagger className="mt-9 flex flex-col gap-4 sm:flex-row" delay={0.1}>
              <MotionItem>
                <Link href="/request-demo" className="inline-flex h-16 w-full items-center justify-center gap-4 rounded-[12px] bg-[#FF5A0A] px-7 text-[17px] font-bold text-white shadow-[0_16px_32px_rgba(249,115,22,0.24)] transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 sm:w-auto">
                  Start free trial <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </MotionItem>
              <MotionItem>
                <Link href="/request-demo" className="inline-flex h-16 w-full items-center justify-center gap-4 rounded-[12px] border border-[#E5E7EB] bg-white px-7 text-[17px] font-bold text-[#111827] shadow-sm transition hover:border-[#F97316] hover:text-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 sm:w-auto">
                  Book a Demo <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </Link>
              </MotionItem>
            </MotionStagger>

            <p className="mt-5 text-[13px] font-medium text-[#667085]">No credit card required. Cancel anytime.</p>

            <div className="mt-12 grid max-w-[690px] grid-cols-2 gap-5 sm:grid-cols-4">
              {proofItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon className="h-7 w-7 shrink-0 text-[#344054]" aria-hidden="true" />
                  <div>
                    <p className="text-[15px] font-extrabold text-[#111827]">{item.value}</p>
                    <p className="text-[13px] leading-5 text-[#667085]">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </MotionReveal>
        </div>

        <HeroShowcase />
      </div>
    </section>
  );
}

function TrustedStrip() {
  return (
    <section className="border-y border-[#E5E7EB] bg-white py-9">
      <div className="mx-auto max-w-[1720px] px-5 sm:px-8 lg:px-16">
        <p className="text-center text-[18px] font-medium text-[#607089]">Trusted by local businesses across the UAE</p>
        <div className="mt-8 grid grid-cols-2 gap-3 text-center text-[13px] font-bold uppercase tracking-[0.22em] text-[#94A3B8] sm:grid-cols-3 lg:grid-cols-6">
          {logos.map((logo) => (
            <div key={logo} className="rounded-2xl border border-[#EEF2F6] bg-[#FBFCFE] px-4 py-4">
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsOverview() {
  return (
    <section className="px-5 py-16 sm:px-8 lg:px-16">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow="Product" title="Everything your team needs to run loyalty in one place" description="Launch cards, scan customers, track rewards, and understand what brings people back." />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <MarketingCard key={benefit.title} {...benefit} />
          ))}
        </div>
        <Link href="/benefits" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#EA580C]">
          Explore product benefits <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function IndustrySolutions() {
  return (
    <section className="border-y border-[#EEF2F6] bg-[#FAFBFC] px-5 py-16 sm:px-8 lg:px-16">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow="Solutions" title="Built for the businesses your customers visit every week" description="Loyalty Card UAE fits the rhythm of local service, retail, and hospitality teams." />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.map((solution) => (
            <Link key={solution} href="/solutions" className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 font-bold text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:text-[#EA580C]">
              {solution}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="px-5 py-16 sm:px-8 lg:px-16">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow="Pricing" title="Simple plans for real local operations" description="Start with one branch, then grow into multi-branch loyalty when your business is ready." />
        <div className="mt-10">
          <PricingPlanCards compact />
        </div>
      </div>
    </section>
  );
}

function FaqTeaser() {
  return (
    <section className="border-y border-[#EEF2F6] bg-[#FAFBFC] px-5 py-16 sm:px-8 lg:px-16">
      <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading eyebrow="FAQ" title="Clear answers before you launch" description="The platform is designed to be simple for customers, practical for staff, and controlled for owners." />
        <div className="grid gap-4">
          {faqs.map(([question, answer]) => (
            <article key={question} className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <h3 className="font-bold text-[#111827]">{question}</h3>
              <p className="mt-2 text-sm leading-6 text-[#607089]">{answer}</p>
            </article>
          ))}
          <Link href="/faq" className="inline-flex items-center gap-2 text-sm font-bold text-[#EA580C]">
            Read all FAQs <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
