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
  Coffee,
  Utensils,
  Scissors,
  Flower2,
  Car,
  TrendingUp,
  Zap,
  Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const features = [
  {
    title: "Digital Loyalty Cards",
    description: "Customers keep their card on their phone. No app required.",
    icon: Gift,
  },
  {
    title: "Referral Growth",
    description: "Turn loyal customers into brand advocates.",
    icon: Users,
  },
  {
    title: "Customer Tiers",
    description: "Reward Silver, Gold, and VIP customers automatically.",
    icon: Award,
  },
];

const industries = [
  { name: "Coffee Shops", icon: Coffee },
  { name: "Restaurants", icon: Utensils },
  { name: "Barbershops", icon: Scissors },
  { name: "Beauty Salons", icon: Flower2 },
  { name: "Car Care Centers", icon: Car },
];

const steps = [
  {
    title: "Customer Joins",
    description: "Create a customer profile and share the digital card.",
  },
  {
    title: "Scan QR Code",
    description: "Use the scanner or manual fallback to record visits.",
  },
  {
    title: "Earn Rewards",
    description: "Customers accumulate stamps toward their next reward.",
  },
  {
    title: "Return More Often",
    description: "Redeem the reward and restart the next loyalty cycle.",
  },
];

const benefits = [
  { label: "Increase repeat visits", icon: TrendingUp },
  { label: "Improve customer retention", icon: Users },
  { label: "Reward loyal customers", icon: Gift },
  { label: "Grow through referrals", icon: Sparkles },
  { label: "Track loyalty performance", icon: BarChart3 },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "AED 100",
    period: "/month",
    yearlyPrice: "AED 1,000/year",
    features: ["1 Branch", "1 Program"],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "AED 200",
    period: "/month",
    yearlyPrice: "AED 2,000/year",
    features: ["3 Branches", "5 Programs"],
    highlighted: true,
  },
  {
    name: "Multi Branch",
    price: "AED 1,000",
    period: "/year per branch",
    yearlyPrice: "",
    features: ["10 Branches", "15 Programs"],
    highlighted: false,
  },
];

const pricingIncludes = [
  "Referrals",
  "Customer Tiers",
  "Reports",
  "CSV Exports",
  "Branding",
];

const faqs = [
  {
    question: "Do customers need an app?",
    answer:
      "No. Customers access their loyalty card directly from their phone browser. No app download required.",
  },
  {
    question: "Can I use multiple branches?",
    answer:
      "Yes. All plans support multi-branch operations with centralized reporting and per-branch customization.",
  },
  {
    question: "How do referrals work?",
    answer:
      "Loyal customers receive a unique referral link. When new customers join through the link, both earn rewards.",
  },
  {
    question: "Can staff issue stamps?",
    answer:
      "Yes. Staff can scan QR codes or manually issue stamps through the dashboard. Full audit trail included.",
  },
  {
    question: "How does QR scanning work?",
    answer:
      "Staff use the built-in scanner to instantly record visits, issue stamps, and track customer activity in real-time.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#1E293B]">
      <PublicHeader />
      <HeroSection />
      <IndustriesSection />
      <WhyLoyaltyBaseSection />
      <HowItWorksSection />
      <PlatformPreviewSection />
      <BenefitsSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <Footer />
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="LoyaltyBase homepage">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
            LB
          </span>
          <span className="text-lg font-bold text-[#1E293B]">LoyaltyBase</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-gray-600 md:flex">
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
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1E293B] transition hover:border-[#F97316] hover:text-[#EA580C]">
            Login
          </Link>
          <a href="mailto:hello@loyaltybase.ae?subject=Request%20Demo" className="hidden rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#EA580C] sm:inline-flex">
            Request Demo
          </a>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="overflow-hidden border-b border-orange-100 bg-gradient-to-b from-orange-50 to-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-sm font-semibold text-[#EA580C] shadow-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Loyalty for growing businesses
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-[#1E293B] sm:text-6xl lg:text-7xl">
            Turn Every Visit Into Customer Loyalty
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Digital loyalty cards, referrals, rewards, and customer tiers designed for growing businesses.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a href="mailto:hello@loyaltybase.ae?subject=Request%20Demo" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-[#EA580C]">
              Request Demo
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </a>
            <a href="#features" className="inline-flex items-center justify-center rounded-lg border-2 border-[#F97316] bg-white px-6 py-3 text-base font-semibold text-[#F97316] transition hover:bg-orange-50">
              View Features
            </a>
          </div>
        </div>
        <MobilePreview />
      </div>
    </section>
  );
}

function MobilePreview() {
  return (
    <div className="relative flex justify-center">
      <div className="rounded-3xl border-8 border-black bg-black p-3 shadow-2xl" style={{ width: "280px" }}>
        <div className="rounded-2xl bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-4 text-white">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-semibold text-orange-200">Coffee Club</p>
              <h2 className="mt-1 text-xl font-bold">Mina Hanna</h2>
            </div>
            <span className="rounded-full bg-[#F97316] px-2 py-1 text-xs font-bold uppercase">Gold</span>
          </div>
          <div className="mb-6">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-xs text-orange-100">Stamp progress</p>
                <p className="text-3xl font-bold">8/10</p>
              </div>
              <Gift className="h-8 w-8 text-[#FDBA74]" aria-hidden="true" />
            </div>
            <div className="h-2 rounded-full bg-white/20">
              <div className="h-2 w-4/5 rounded-full bg-[#F97316]" />
            </div>
            <p className="mt-2 text-xs text-orange-100">2 stamps away from free coffee</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-[#1E293B]">
            <p className="text-xs font-semibold text-[#EA580C]">Next Reward</p>
            <p className="mt-1 font-bold">Free Coffee</p>
            <div className="mt-3 flex items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-100 py-3">
              <QrCode className="h-10 w-10 text-[#1E293B]" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndustriesSection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase text-[#EA580C]">Industries</p>
          <h2 className="mt-3 text-3xl font-bold text-[#1E293B]">Perfect for every business type</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {industries.map((industry) => {
            const Icon = industry.icon;
            return (
              <div key={industry.name} className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-center transition hover:border-[#F97316] hover:shadow-md">
                <Icon className="h-8 w-8 text-[#F97316]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[#1E293B]">{industry.name}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WhyLoyaltyBaseSection() {
  return (
    <section id="features" className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase text-[#EA580C]">Why LoyaltyBase</p>
          <h2 className="mt-3 text-3xl font-bold text-[#1E293B]">Everything you need to build loyalty</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#F97316] hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <Icon className="h-6 w-6 text-[#F97316]" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#1E293B]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase text-[#EA580C]">How It Works</p>
          <h2 className="mt-3 text-3xl font-bold text-[#1E293B]">Simple 4-step process</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316] text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#1E293B]">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/3 -right-3 text-2xl text-gray-300">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformPreviewSection() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase text-[#EA580C]">Platform Preview</p>
          <h2 className="mt-3 text-3xl font-bold text-[#1E293B]">Powerful tools for your business</h2>
          <p className="mt-4 max-w-2xl mx-auto text-gray-600">
            Manage your entire loyalty program from one intuitive dashboard. Create programs, enroll customers, scan QR codes, and track performance.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-6">
              <h3 className="font-bold text-[#1E293B]">Business Dashboard</h3>
              <p className="mt-2 text-sm text-gray-600">Real-time analytics, customer insights, and program performance metrics.</p>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-3/4 rounded bg-blue-300" />
                <div className="h-2 w-full rounded bg-blue-300" />
                <div className="h-2 w-2/3 rounded bg-blue-300" />
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-6">
              <h3 className="font-bold text-[#1E293B]">Customer 360</h3>
              <p className="mt-2 text-sm text-gray-600">Complete customer profiles with visit history, rewards, and referral data.</p>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-4/5 rounded bg-purple-300" />
                <div className="h-2 w-full rounded bg-purple-300" />
                <div className="h-2 w-3/5 rounded bg-purple-300" />
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 p-6">
              <h3 className="font-bold text-[#1E293B]">QR Scanner</h3>
              <p className="mt-2 text-sm text-gray-600">Fast, reliable QR scanning for issuing stamps and tracking visits.</p>
              <div className="mt-4 flex items-center justify-center">
                <QrCode className="h-12 w-12 text-[#F97316]" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase text-[#EA580C]">Benefits</p>
          <h2 className="mt-3 text-3xl font-bold text-[#1E293B]">Why businesses choose LoyaltyBase</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.label} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                <Icon className="h-6 w-6 shrink-0 text-[#F97316]" aria-hidden="true" />
                <p className="font-semibold text-[#1E293B]">{benefit.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase text-[#EA580C]">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold text-[#1E293B]">Plans that scale with your business</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border-2 p-8 transition ${
                plan.highlighted
                  ? "border-[#F97316] bg-white shadow-lg scale-105"
                  : "border-gray-200 bg-white"
              }`}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-block rounded-full bg-[#F97316] px-3 py-1 text-xs font-bold text-white uppercase">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-[#1E293B]">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-[#1E293B]">{plan.price}</span>
                <span className="text-gray-600">{plan.period}</span>
              </div>
              {plan.yearlyPrice && (
                <p className="mt-2 text-sm text-gray-600">or {plan.yearlyPrice}</p>
              )}
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
              <a
                href="mailto:hello@loyaltybase.ae?subject=Request%20Demo"
                className={`mt-8 block w-full rounded-lg py-3 text-center font-semibold transition ${
                  plan.highlighted
                    ? "bg-[#F97316] text-white hover:bg-[#EA580C]"
                    : "border-2 border-[#F97316] text-[#F97316] hover:bg-orange-50"
                }`}
              >
                Get Started
              </a>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="font-semibold text-[#1E293B]">All plans include:</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {pricingIncludes.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
                <span className="text-sm text-gray-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase text-[#EA580C]">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold text-[#1E293B]">Common questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details key={faq.question} className="rounded-lg border border-gray-200 bg-white p-6 cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-[#1E293B]">
                <span>{faq.question}</span>
                <CircleHelp className="h-5 w-5 text-[#F97316] group-open:hidden" aria-hidden="true" />
              </summary>
              <p className="mt-4 text-sm text-gray-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="bg-gradient-to-r from-[#F97316] to-[#EA580C] py-16">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-white">Start Building Customer Loyalty Today</h2>
        <p className="mt-4 text-lg text-orange-100">
          Launch your loyalty program in minutes and keep customers coming back.
        </p>
        <a
          href="mailto:hello@loyaltybase.ae?subject=Request%20Demo"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-[#F97316] transition hover:bg-orange-50"
        >
          Request Demo
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
                LB
              </span>
              <span className="font-bold text-[#1E293B]">LoyaltyBase</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Digital loyalty for growing businesses.</p>
          </div>
          <div>
            <p className="font-semibold text-[#1E293B]">Product</p>
            <div className="mt-4 space-y-2">
              <a href="#features" className="block text-sm text-gray-600 transition hover:text-[#F97316]">
                Features
              </a>
              <a href="#pricing" className="block text-sm text-gray-600 transition hover:text-[#F97316]">
                Pricing
              </a>
              <a href="#how-it-works" className="block text-sm text-gray-600 transition hover:text-[#F97316]">
                How it works
              </a>
            </div>
          </div>
          <div>
            <p className="font-semibold text-[#1E293B]">Company</p>
            <div className="mt-4 space-y-2">
              <a href="/login" className="block text-sm text-gray-600 transition hover:text-[#F97316]">
                Login
              </a>
              <a href="mailto:hello@loyaltybase.ae" className="block text-sm text-gray-600 transition hover:text-[#F97316]">
                Contact
              </a>
            </div>
          </div>
          <div>
            <p className="font-semibold text-[#1E293B]">Legal</p>
            <div className="mt-4 space-y-2">
              <a href="/privacy" className="block text-sm text-gray-600 transition hover:text-[#F97316]">
                Privacy Policy
              </a>
              <a href="/terms" className="block text-sm text-gray-600 transition hover:text-[#F97316]">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>&copy; 2024 LoyaltyBase. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

