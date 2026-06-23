import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Car,
  CheckCircle2,
  CircleHelp,
  Coffee,
  Gift,
  MessageSquare,
  QrCode,
  ScanLine,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HomepageLoyaltyCardDemo } from "@/components/HomepageLoyaltyCardDemo";
import { MotionItem, MotionOnScroll, MotionReveal, MotionStagger } from "@/components/HomepageMotion";

const features = [
  {
    title: "Digital stamp cards",
    description: "Create clean loyalty programs that customers can open from any phone.",
    icon: Gift,
  },
  {
    title: "QR scanner operations",
    description: "Staff scan customer cards, issue stamps, and keep branch activity organized.",
    icon: ScanLine,
  },
  {
    title: "Customer retention insights",
    description: "Track repeat visits, reward-ready customers, referrals, and program activity.",
    icon: BarChart3,
  },
  {
    title: "Fraud and risk alerts",
    description: "Detect unusual stamp activity, cooldown violations, and suspicious behavior.",
    icon: ShieldCheck,
  },
  {
    title: "Referral growth",
    description: "Let loyal customers invite new customers and qualify rewards after real activity.",
    icon: Users,
  },
  {
    title: "Message preparation",
    description: "Prepare WhatsApp-ready loyalty messages without sending real provider traffic yet.",
    icon: MessageSquare,
  },
];

const steps = [
  "Create a loyalty program",
  "Enroll a customer",
  "Scan QR and add stamps",
  "Unlock and redeem rewards",
];

const customerJourney = [
  { title: "Join by QR", description: "Customers scan or receive a secure loyalty card link.", icon: QrCode },
  { title: "Open digital card", description: "No app download. The card opens on any mobile browser.", icon: Gift },
  { title: "Staff adds stamp", description: "Your team scans the card and records each visit quickly.", icon: ScanLine },
  { title: "Reward unlocked", description: "Customers see when the next reward is ready.", icon: CheckCircle2 },
  { title: "Customer returns again", description: "Simple rewards keep repeat visits easy to remember.", icon: Users },
];

const localBusinesses = [
  { name: "Coffee shops", icon: Coffee },
  { name: "Restaurants", icon: Utensils },
  { name: "Barbershops", icon: Scissors },
  { name: "Beauty salons", icon: Sparkles },
  { name: "Car care centers", icon: Car },
  { name: "Retail stores", icon: ShoppingBag },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "AED 100/month",
    limits: ["1 branch", "1 program"],
  },
  {
    name: "Growth",
    price: "AED 200/month",
    limits: ["3 branches", "5 programs"],
    featured: true,
  },
  {
    name: "Multi Branch",
    price: "AED 1000/year per branch",
    limits: ["10 branches", "15 programs"],
  },
];

const includedPlanFeatures = ["Referrals", "Customer tiers", "Reports", "CSV exports", "Branding"];

const faqs = [
  {
    question: "Is LoyaltyBase ready for real pilot businesses?",
    answer: "Yes. It supports controlled pilot operations with business setup, staff accounts, customer cards, scanner workflows, referrals, rewards, billing visibility, and audit trails.",
  },
  {
    question: "Does the homepage require an account?",
    answer: "No. This page is public and focused on prospective businesses evaluating LoyaltyBase for a pilot.",
  },
  {
    question: "Does LoyaltyBase send WhatsApp or SMS automatically?",
    answer: "No. Message and WhatsApp flows are prepared for manual sharing today, with provider-ready foundations for future integrations.",
  },
  {
    question: "Which businesses is it designed for?",
    answer: "Coffee shops, restaurants, salons, barbershops, gyms, retail stores, car care centers, and service businesses with repeat customers.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#1E293B]">
      <PublicHeader />
      <HeroSection />
      <CustomerJourneySection />
      <TrustSection />
      <LocalBusinessSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingTeaserSection />
      <FaqSection />
      <Footer />
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="LoyaltyBase homepage">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
            LB
          </span>
          <span className="truncate text-base font-semibold text-[#111827]">LoyaltyBase</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-[#64748B] md:flex" aria-label="Homepage navigation">
          <Link href="/" className="transition hover:text-[#F97316]">
            Home
          </Link>
          <Link href="/benefits" className="transition hover:text-[#F97316]">
            Benefits
          </Link>
          <Link href="/request-demo" className="transition hover:text-[#F97316]">
            Request Demo
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/request-demo" className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#EA580C]">
            Request Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-orange-100 bg-[radial-gradient(circle_at_top_left,#FED7AA_0,transparent_32%),linear-gradient(135deg,#FFF7ED_0%,#FFFFFF_48%,#FFEDD5_100%)]">
      <div className="pointer-events-none absolute left-8 top-24 hidden h-24 w-24 animate-float rounded-full border border-orange-200/70 bg-white/35 lg:block" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-12 right-12 hidden h-32 w-32 rounded-full bg-orange-200/25 blur-2xl lg:block" aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:px-8 lg:py-20">
        <MotionReveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/85 px-3 py-1 text-sm font-semibold text-[#EA580C] shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Loyalty operations for coffee shops, restaurants, and local brands
          </span>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-[#111827] sm:text-5xl lg:text-6xl">
            Turn occasional customers into{" "}
            <span className="bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">
              loyal regulars
            </span>
            .
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#64748B]">
            Create digital stamp cards, reward repeat visits, grow customer retention, and track loyalty performance across every branch.
          </p>
          <MotionStagger className="mt-8 flex flex-col gap-3 sm:flex-row" delay={0.2}>
            <MotionItem>
              <Link href="/request-demo" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-95 sm:w-auto">
                Request a Demo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </MotionItem>
            <MotionItem>
              <Link href="/benefits" className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-orange-200 bg-white/90 px-6 py-3 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-[#F97316] hover:text-[#EA580C] sm:w-auto">
                View Benefits
              </Link>
            </MotionItem>
          </MotionStagger>
          <div className="mt-8 grid max-w-xl gap-3 text-sm font-semibold text-[#64748B] sm:grid-cols-3">
            <span className="rounded-2xl border border-orange-100 bg-white/70 px-4 py-3">No app needed</span>
            <span className="rounded-2xl border border-orange-100 bg-white/70 px-4 py-3">QR scanner ready</span>
            <span className="rounded-2xl border border-orange-100 bg-white/70 px-4 py-3">Mobile-first cards</span>
          </div>
        </MotionReveal>
        <LoyaltyCardPreview />
      </div>
    </section>
  );
}

function LoyaltyCardPreview() {
  return (
    <MotionReveal delay={0.15} className="relative">
      <HomepageLoyaltyCardDemo />
    </MotionReveal>
  );
}

function CustomerJourneySection() {
  return (
    <section className="border-b border-orange-100 bg-white py-14">
      <SectionHeading eyebrow="Customer journey" title="How customers use LoyaltyBase" />
      <div className="mx-auto mt-10 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-5 lg:px-8">
        {customerJourney.map((item, index) => (
          <MotionOnScroll key={item.title} delay={index * 0.04} className="relative rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.14em] text-[#EA580C]">Step {index + 1}</p>
            <h3 className="mt-2 text-lg font-semibold text-[#111827]">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#64748B]">{item.description}</p>
          </MotionOnScroll>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="border-b border-[#E5E7EB] bg-[#FFF7ED] py-12">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
        <TrustMetric value="No customer app required" label="Customers open their card instantly from a link, QR, or WhatsApp message." />
        <TrustMetric value="QR scanner ready" label="Staff can issue stamps and redeem rewards with a simple scan workflow." />
        <TrustMetric value="Customer retention focused" label="Bring people back with progress, rewards, referrals, and tiers." />
        <TrustMetric value="Multi-branch support" label="Keep customers, programs, staff, and activity organized as you grow." />
      </div>
    </section>
  );
}

function LocalBusinessSection() {
  return (
    <section className="bg-white py-16">
      <SectionHeading eyebrow="Local businesses" title="Built for local businesses" />
      <div className="mx-auto mt-10 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {localBusinesses.map((business) => (
          <MotionOnScroll key={business.name} className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
              <business.icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold text-[#111827]">{business.name}</h3>
              <p className="mt-1 text-sm text-[#64748B]">Simple loyalty tools for repeat customer visits.</p>
            </div>
          </MotionOnScroll>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-16">
      <SectionHeading eyebrow="Features" title="Everything needed to run a loyalty program day to day" />
      <div className="mx-auto mt-10 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-[#FAFAFA] py-16">
      <SectionHeading eyebrow="How it works" title="A simple flow your team can use every day" />
      <div className="mx-auto mt-10 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-sm font-bold text-[#F97316]">
              {index + 1}
            </span>
            <h3 className="mt-5 text-lg font-semibold text-[#111827]">{step}</h3>
            <p className="mt-3 text-sm leading-6 text-[#64748B]">
              {index === 0 && "Set the reward, stamp target, and bonus stamp rules."}
              {index === 1 && "Create a customer profile and share the digital card."}
              {index === 2 && "Use the scanner or manual fallback to record visits."}
              {index === 3 && "Redeem the reward and restart the next loyalty cycle."}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingTeaserSection() {
  return (
    <section id="pricing" className="bg-white py-16">
      <SectionHeading eyebrow="Simple pricing" title="Start small, grow by branch" />
      <div className="mx-auto mt-10 grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        {pricingPlans.map((plan) => (
          <MotionOnScroll key={plan.name} className={`rounded-3xl border p-6 shadow-sm ${plan.featured ? "border-orange-200 bg-orange-50 shadow-orange-100" : "border-[#E5E7EB] bg-white"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-[#111827]">{plan.name}</h3>
                <p className="mt-3 text-3xl font-semibold text-[#EA580C]">{plan.price}</p>
              </div>
              {plan.featured && (
                <span className="rounded-full bg-[#F97316] px-3 py-1 text-xs font-bold uppercase text-white">Popular</span>
              )}
            </div>
            <div className="mt-6 grid gap-2">
              {plan.limits.map((limit) => (
                <p key={limit} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#475569] shadow-sm">
                  {limit}
                </p>
              ))}
            </div>
            <div className="mt-6 border-t border-orange-100 pt-5">
              <p className="text-sm font-semibold text-[#111827]">Included in every plan</p>
              <ul className="mt-4 grid gap-3 text-sm text-[#64748B]">
                {includedPlanFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F97316]" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/request-demo" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-100 transition hover:brightness-95">
              Request Demo
            </Link>
          </MotionOnScroll>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="bg-[#FAFAFA] py-16">
      <SectionHeading eyebrow="FAQ" title="Questions before your first pilot" />
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 px-4 sm:px-6 lg:px-8">
        {faqs.map((faq) => (
          <div key={faq.question} className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex gap-3">
              <CircleHelp className="mt-1 h-5 w-5 shrink-0 text-[#F97316]" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-[#111827]">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">{faq.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[#64748B] sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F97316] text-xs font-bold text-white">
              LB
            </span>
            <span className="font-semibold text-[#111827]">LoyaltyBase</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="font-semibold text-[#64748B] hover:text-[#EA580C]">Home</Link>
            <Link href="/benefits" className="font-semibold text-[#64748B] hover:text-[#EA580C]">Benefits</Link>
            <Link href="/request-demo" className="font-semibold text-[#EA580C]">Request Demo</Link>
          </div>
        </div>
        <p>Digital loyalty operations for UAE and GCC small businesses.</p>
        <p className="text-xs text-[#94A3B8]">Existing users can access their workspace through the direct login page.</p>
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase text-[#EA580C]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">{title}</h2>
    </div>
  );
}

function TrustMetric({ value, label }: { value: string; label: string }) {
  return (
    <MotionOnScroll className="rounded-2xl border border-orange-100 bg-white p-5 text-center shadow-sm">
      <p className="text-lg font-semibold text-[#111827]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[#64748B]">{label}</p>
    </MotionOnScroll>
  );
}

function FeatureCard({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <MotionOnScroll className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-[#111827]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#64748B]">{description}</p>
    </MotionOnScroll>
  );
}