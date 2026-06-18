import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleHelp,
  Gift,
  MessageSquare,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

const faqs = [
  {
    question: "Is LoyaltyBase ready for real pilot businesses?",
    answer: "Yes. It supports controlled pilot operations with business setup, staff accounts, customer cards, scanner workflows, referrals, rewards, billing visibility, and audit trails.",
  },
  {
    question: "Does the homepage require login?",
    answer: "No. This page is public. Business users sign in through the Login button and then access their correct workspace.",
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
      <TrustSection />
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
        <Link href="/" className="flex items-center gap-3" aria-label="LoyaltyBase homepage">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
            LB
          </span>
          <span className="text-base font-semibold text-[#111827]">LoyaltyBase</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-[#64748B] md:flex" aria-label="Homepage navigation">
          <a href="#features" className="transition hover:text-[#F97316]">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-[#F97316]">
            How it works
          </a>
          <a href="#pricing" className="transition hover:text-[#F97316]">
            Pricing
          </a>
          <a href="#faq" className="transition hover:text-[#F97316]">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#EA580C]">
            Login
          </Link>
          <a href="mailto:hello@loyaltybase.ae?subject=LoyaltyBase%20Pilot%20Request" className="hidden rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#EA580C] sm:inline-flex">
            Start Pilot
          </a>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="overflow-hidden border-b border-orange-100 bg-gradient-to-b from-orange-50/70 to-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_460px] lg:items-center lg:px-8 lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-sm font-semibold text-[#EA580C] shadow-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Loyalty operations for growing businesses
          </span>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-[#111827] sm:text-5xl lg:text-6xl">
            Turn occasional customers into loyal regulars.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#64748B]">
            Create digital stamp cards, reward repeat visits, grow customer retention, and track loyalty performance across every branch.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#F97316] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#EA580C]">
              Login
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="mailto:hello@loyaltybase.ae?subject=LoyaltyBase%20Demo%20Request" className="inline-flex items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#EA580C]">
              Request Demo / Start Pilot
            </a>
          </div>
        </div>
        <LoyaltyCardPreview />
      </div>
    </section>
  );
}

function LoyaltyCardPreview() {
  return (
    <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-2xl shadow-orange-100">
      <div className="rounded-[22px] bg-[#111827] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-orange-200">Coffee Club</p>
            <h2 className="mt-2 text-2xl font-semibold">Mina Hanna</h2>
          </div>
          <span className="rounded-full bg-[#F97316] px-3 py-1 text-xs font-bold uppercase">Gold Member</span>
        </div>
        <div className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-orange-100">Stamp progress</p>
              <p className="mt-1 text-4xl font-semibold">8/10</p>
            </div>
            <Gift className="h-10 w-10 text-[#FDBA74]" aria-hidden="true" />
          </div>
          <div className="mt-4 h-3 rounded-full bg-white/15">
            <div className="h-3 w-4/5 rounded-full bg-[#F97316]" />
          </div>
          <p className="mt-3 text-sm text-orange-100">2 stamps away from a free coffee</p>
        </div>
        <div className="mt-8 grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl bg-white p-4 text-[#111827]">
          <div>
            <p className="text-sm font-semibold text-[#EA580C]">Reward Preview</p>
            <p className="mt-1 text-lg font-semibold">Free Coffee</p>
            <p className="mt-1 text-sm text-[#64748B]">Show QR code to earn or redeem.</p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-md border border-[#E5E7EB] bg-[#FAFAFA]">
            <QrCode className="h-12 w-12 text-[#111827]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustSection() {
  return (
    <section className="border-b border-[#E5E7EB] bg-white py-10">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
        <TrustMetric value="Multi-branch" label="Built for growing operations" />
        <TrustMetric value="QR-first" label="Fast staff scanner workflow" />
        <TrustMetric value="Audit-ready" label="Activity, alerts, and controls" />
        <TrustMetric value="Pilot-ready" label="Designed for real validation" />
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6 sm:p-8 lg:grid lg:grid-cols-[1fr_360px] lg:items-center lg:gap-8">
          <div>
            <p className="text-sm font-semibold uppercase text-[#EA580C]">Pricing teaser</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827]">Start small, grow by branch.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
              LoyaltyBase supports Starter, Growth, and Multi Branch plans. All plans include customers, programs, referrals, tiers, reports, CSV exports, and branding.
            </p>
          </div>
          <div className="mt-6 rounded-md bg-white p-5 shadow-sm lg:mt-0">
            <p className="text-sm font-semibold text-[#64748B]">Starter from</p>
            <p className="mt-2 text-4xl font-semibold text-[#111827]">AED 100</p>
            <p className="mt-1 text-sm text-[#64748B]">per month</p>
            <Link href="/login" className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#F97316] px-4 py-3 text-sm font-semibold text-white hover:bg-[#EA580C]">
              Open Dashboard
            </Link>
          </div>
        </div>
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
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[#64748B] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F97316] text-xs font-bold text-white">
            LB
          </span>
          <span className="font-semibold text-[#111827]">LoyaltyBase</span>
        </div>
        <p>Digital loyalty operations for small businesses.</p>
        <div className="flex gap-4">
          <Link href="/login" className="font-semibold text-[#EA580C]">
            Login
          </Link>
          <a href="mailto:hello@loyaltybase.ae" className="font-semibold text-[#EA580C]">
            Request Demo
          </a>
        </div>
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
    <div className="rounded-md border border-[#E5E7EB] bg-white p-4 text-center shadow-sm">
      <p className="text-lg font-semibold text-[#111827]">{value}</p>
      <p className="mt-1 text-sm text-[#64748B]">{label}</p>
    </div>
  );
}

function FeatureCard({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-[#111827]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#64748B]">{description}</p>
    </div>
  );
}
