import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Gift,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
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
  ["How does scanning work?", "Your team scans the card QR code, then LoyaltyBase opens the secure customer action flow."],
  ["Can branches use it?", "Yes. Plans include branch limits and staff workflows designed for local operations."],
];

const qrCells = [0, 1, 2, 4, 5, 7, 9, 10, 12, 13, 16, 18, 20, 21, 23, 24];

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
              Launch a modern loyalty program in minutes. Reward more purchases. Grow your business.
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

        <ProductPreview />
      </div>
    </section>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto min-h-[640px] w-full max-w-[820px] lg:min-h-[760px]" aria-label="LoyaltyBase product interface">
      <div className="absolute right-6 top-24 hidden h-56 w-72 opacity-40 lg:block" aria-hidden="true">
        <div className="grid grid-cols-9 gap-3">
          {Array.from({ length: 72 }).map((_, index) => (
            <span key={index} className="h-1.5 w-1.5 rounded-full bg-[#94A3B8]" />
          ))}
        </div>
      </div>

      <FloatingInfoCard className="left-0 top-36 hidden lg:block" title="Scan. Earn. Enjoy." text="Staff scan once at checkout. Customers keep earning without installing an app.">
        <div className="mt-6 flex items-end justify-between rounded-[18px] bg-[#F8FAFC] p-4">
          <MiniQr className="h-20 w-20 rounded-xl bg-white p-3 shadow-sm" />
          <div className="h-28 w-16 -rotate-6 rounded-[14px] border-[5px] border-[#111827] bg-white p-2 shadow-lg">
            <MiniQr className="mt-8 h-8 w-8" />
          </div>
        </div>
      </FloatingInfoCard>

      <FloatingInfoCard className="bottom-24 left-0 hidden lg:block" title="Reward Ready" text="Show customers exactly when the next reward is available.">
        <div className="mt-4 flex justify-end">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FFF7ED] text-[#F97316] shadow-inner">
            <Gift className="h-10 w-10" aria-hidden="true" />
          </div>
        </div>
      </FloatingInfoCard>

      <div className="relative mx-auto w-[340px] pt-4 sm:w-[420px] lg:ml-[300px]">
        <div className="rounded-[46px] border border-[#D4D7DE] bg-[#111827] p-[10px] shadow-[0_32px_90px_rgba(15,23,42,0.24)]">
          <div className="relative overflow-hidden rounded-[38px] bg-[#F8FAFC] p-5">
            <div className="absolute left-1/2 top-3 h-7 w-28 -translate-x-1/2 rounded-full bg-[#030712]" aria-hidden="true" />
            <div className="mb-8 flex items-center justify-between pt-4 text-[13px] font-bold text-[#111827]">
              <span>9:41</span>
              <span>LTE</span>
            </div>

            <div className="rounded-[22px] bg-white p-5 shadow-sm">
              <p className="text-[13px] text-[#475569]">Good morning, Alex</p>
              <p className="mt-2 text-[42px] font-extrabold tracking-[-0.05em] text-[#0F172A]">250</p>
              <p className="-mt-1 text-[13px] text-[#64748B]">Reward points</p>
            </div>

            <div className="mt-5 rounded-[20px] bg-[linear-gradient(135deg,#111827,#374151)] p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.20)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[15px] font-bold">COFFEE CORNER</p>
                  <p className="text-[12px] text-white/65">Loyalty Card</p>
                </div>
                <Gift className="h-9 w-9 text-orange-100" aria-hidden="true" />
              </div>
              <div className="mt-5 grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${i < 7 ? "bg-[#FF5A0A] text-white" : "bg-white text-[#111827]"}`}>
                    {i + 1}
                  </span>
                ))}
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-white/20">
                <div className="h-full w-[70%] rounded-full bg-[#FF5A0A]" />
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] text-white/70">
                <span>7 of 10 visits</span>
                <span className="text-[#FFB27A]">Free drink</span>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <MiniQr className="h-16 w-16 rounded-xl bg-[#F8FAFC] p-2" />
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#111827]">Scan in-store</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Show this code to earn visits</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5 rounded-[18px] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold text-[#111827]">Your progress</p>
                <p className="text-[12px] font-semibold text-[#FF5A0A]">View history</p>
              </div>
              <p className="mt-4 text-[12px] text-[#64748B]">3 visits until a reward.</p>
              <div className="mt-3 h-2 rounded-full bg-[#E5E7EB]">
                <div className="h-full w-[70%] rounded-full bg-[#FF5A0A]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-2 top-[250px] hidden w-[250px] rounded-[28px] bg-[#111827] p-4 text-white shadow-[0_22px_60px_rgba(15,23,42,0.28)] xl:block">
        <div className="flex items-center justify-between text-[13px] font-bold">
          <span>Wallet pass</span>
          <span>...</span>
        </div>
        <div className="mt-4 rounded-[18px] bg-[linear-gradient(135deg,#374151,#111827)] p-4 ring-1 ring-white/10">
          <p className="text-[12px] text-white/70">COFFEE CORNER</p>
          <p className="text-[12px] font-bold text-[#FFB27A]">REWARDS PASS</p>
          <p className="mt-5 text-[12px] text-white/70">BALANCE</p>
          <p className="text-[32px] font-bold">250<span className="text-[14px]"> pts</span></p>
          <div className="mt-4 rounded-xl bg-white p-3">
            <div className="h-12 rounded bg-[repeating-linear-gradient(90deg,#111827_0_4px,#fff_4px_8px)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingInfoCard({ className, title, text, children }: { className: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className={`absolute z-20 w-[260px] rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.12)] ${className}`}>
      <p className="text-[17px] font-extrabold text-[#111827]">{title}</p>
      <p className="mt-3 text-[14px] leading-6 text-[#607089]">{text}</p>
      {children}
    </div>
  );
}

function MiniQr({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="grid h-full w-full grid-cols-5 gap-1">
        {Array.from({ length: 25 }).map((_, index) => (
          <span key={index} className={qrCells.includes(index) ? "rounded-[2px] bg-[#0B1220]" : "rounded-[2px] bg-transparent"} />
        ))}
      </div>
    </div>
  );
}

function TrustedStrip() {
  return (
    <section className="border-y border-[#E5E7EB] bg-white py-9">
      <div className="mx-auto max-w-[1720px] px-5 sm:px-8 lg:px-16">
        <p className="text-center text-[18px] font-medium text-[#607089]">Trusted by local businesses around the world</p>
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
        <SectionHeading eyebrow="Solutions" title="Built for the businesses your customers visit every week" description="LoyaltyBase fits the rhythm of local service, retail, and hospitality teams." />
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
