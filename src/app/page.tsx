import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Coffee,
  Gift,
  Heart,
  HeartHandshake,
  MapPin,
  QrCode,
  RefreshCcw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Stamp,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { redirectAuthenticatedUser } from "@/lib/session";

const journeyMetrics = [
  { label: "Branches Connected", value: "128" },
  { label: "Active Members", value: "42k" },
  { label: "Repeat Visit Increase", value: "+28%" },
  { label: "Rewards Redeemed", value: "9.4k" },
];

const regionNodes = [
  { name: "Kuwait", className: "left-[42%] top-[6%]" },
  { name: "Bahrain", className: "left-[16%] top-[30%]" },
  { name: "Qatar", className: "left-[30%] top-[54%]" },
  { name: "Saudi Arabia", className: "left-[44%] top-[76%]" },
  { name: "Oman", className: "right-[12%] top-[32%]" },
  { name: "Jordan", className: "right-[24%] top-[60%]" },
  { name: "Egypt", className: "right-[9%] top-[82%]" },
];

const regionStats = [
  { label: "Countries Supported", value: "8" },
  { label: "Branches Managed", value: "250+" },
  { label: "Loyalty Programs", value: "640+" },
  { label: "Active Members", value: "120k+" },
];

const benefits = [
  {
    title: "Increase Repeat Visits",
    eyebrow: "+28%",
    metric: "Repeat Customer Visits",
    description: "Give customers visible progress and a reason to choose your business again.",
    icon: RefreshCcw,
    visual: "trend",
  },
  {
    title: "Reward Loyal Customers",
    eyebrow: "10 Purchases",
    metric: "Free Coffee",
    description: "Turn simple purchase moments into rewards customers can understand instantly.",
    icon: Gift,
    visual: "reward",
  },
  {
    title: "Grow Revenue",
    eyebrow: "80%",
    metric: "Revenue From Returning Customers",
    description: "Focus retention work around the customers most likely to buy again.",
    icon: TrendingUp,
    visual: "revenue",
  },
  {
    title: "Multi-Branch Operations",
    eyebrow: "Manage Multiple Locations",
    metric: "From One Platform",
    description: "Keep customers, staff, QR scans, stamps, and rewards connected across branches.",
    icon: Building2,
    visual: "branches",
  },
  {
    title: "Fraud Protection",
    eyebrow: "Automatic Detection",
    metric: "Of Suspicious Activity",
    description: "Protect loyalty value with alerts, audit history, cooldowns, and risk monitoring.",
    icon: ShieldAlert,
    visual: "shield",
  },
  {
    title: "Referral Growth",
    eyebrow: "Customers Bring",
    metric: "New Customers",
    description: "Let loyal customers become advocates while qualification stays controlled.",
    icon: HeartHandshake,
    visual: "referral",
  },
];

const customerJourney = [
  { title: "Customer Visits", description: "A regular order becomes the start of a loyalty moment.", icon: Coffee },
  { title: "Staff Scans QR", description: "The team scans a secure customer card from any phone.", icon: ScanLine },
  { title: "Stamp Earned", description: "Progress updates clearly without slowing the counter.", icon: Stamp },
  { title: "Reward Unlocked", description: "The customer sees a clear reward-ready state.", icon: Gift },
  { title: "Customer Returns", description: "The next visit starts a new retention cycle.", icon: RefreshCcw },
];

const activityItems = [
  "Coffee Purchased",
  "Stamp Earned",
  "Reward Redeemed",
  "New Member Joined",
  "Referral Completed",
  "Loyalty Milestone Reached",
];

export default async function Home() {
  await redirectAuthenticatedUser();

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#111827]">
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="LoyaltyBase home">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white shadow-sm">
              LB
            </span>
            <span className="text-base font-semibold tracking-tight">LoyaltyBase</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#6B7280] lg:flex" aria-label="Primary">
            <a href="#journey" className="transition hover:text-[#F97316]">
              Journey
            </a>
            <a href="#network" className="transition hover:text-[#F97316]">
              Network
            </a>
            <a href="#benefits" className="transition hover:text-[#F97316]">
              Benefits
            </a>
            <a href="#how-it-works" className="transition hover:text-[#F97316]">
              How it works
            </a>
          </nav>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            Login
          </Link>
        </div>
      </header>

      <section id="journey" className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_22%_18%,rgba(249,115,22,0.14),transparent_34%),radial-gradient(circle_at_80%_8%,rgba(253,186,116,0.22),transparent_30%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-20">
          <div className="homepage-reveal">
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-semibold uppercase text-[#F97316] shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Premium loyalty SaaS
            </p>
            <h1 className="mt-7 max-w-4xl text-4xl font-semibold tracking-tight text-[#111827] sm:text-5xl lg:text-6xl">
              Turn occasional customers into loyal regulars.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#6B7280]">
              Create digital stamp cards, reward repeat visits, grow customer retention, and track loyalty performance
              across every branch.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#F97316] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#benefits"
                className="inline-flex h-12 items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-6 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-[#F97316] hover:text-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
              >
                Explore Benefits
              </a>
            </div>
          </div>

          <InteractiveLoyaltyJourney />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-4">
            {journeyMetrics.map((metric, index) => (
              <MetricCard key={metric.label} {...metric} delay={index} />
            ))}
          </div>
        </div>
      </section>

      <ActivityTicker />

      <section id="network" className="border-y border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
          <div className="homepage-reveal">
            <p className="text-sm font-semibold uppercase text-[#F97316]">Regional operations network</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">
              Built for growing businesses across the Gulf and Middle East
            </h2>
            <p className="mt-4 text-base leading-7 text-[#6B7280]">
              Operate loyalty programs across multiple branches, cities, and countries from a single platform.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {regionStats.map((stat, index) => (
                <MetricCard key={stat.label} {...stat} delay={index} compact />
              ))}
            </div>
          </div>
          <RegionalNetwork />
        </div>
      </section>

      <section id="benefits" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Business outcomes"
          title="Built around the results business owners care about"
          description="LoyaltyBase turns retention into a visible operating system for owners, managers, staff, and customers."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {benefits.map((benefit) => (
            <OutcomeCard key={benefit.title} {...benefit} />
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionIntro
            eyebrow="Customer journey"
            title="How LoyaltyBase Works"
            description="A complete loyalty cycle designed for busy counters, returning customers, and growing branch teams."
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            {customerJourney.map((step, index) => (
              <JourneyStep key={step.title} index={index + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-[#F97316]">Daily operations</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">
              Premium enough for owners. Simple enough for staff.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#6B7280]">
              LoyaltyBase keeps the emotional customer experience polished while giving staff practical tools for
              scans, stamps, rewards, referrals, and suspicious activity checks.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Staff scanner", icon: ScanLine },
              { label: "Digital customer cards", icon: WalletCards },
              { label: "Reward redemption", icon: Gift },
              { label: "Referral sharing", icon: HeartHandshake },
              { label: "Audit trail", icon: ShieldAlert },
              { label: "Multi-branch visibility", icon: Building2 },
            ].map((item) => (
              <div key={item.label} className="group flex items-center gap-3 rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-orange-50 text-[#F97316] transition group-hover:bg-[#F97316] group-hover:text-white">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[#111827]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-[#111827] p-7 text-white shadow-xl sm:p-10">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#F97316]/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-[#FDBA74]">Ready for retention</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to build stronger customer loyalty?
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-white/70">
                Start managing customers, stamps, rewards, referrals, and branch activity from one premium platform.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#F97316] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#FDBA74] focus:ring-offset-2 focus:ring-offset-[#111827]"
            >
              Sign in to dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function InteractiveLoyaltyJourney() {
  return (
    <div className="homepage-reveal relative mx-auto w-full max-w-[540px]">
      <div className="absolute -left-5 top-16 hidden rounded-md border border-[#E5E7EB] bg-white p-3 shadow-lg sm:block">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
            <Coffee className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-[#111827]">Coffee purchased</p>
            <p className="text-xs text-[#6B7280]">Al Khan branch</p>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 bottom-24 hidden rounded-md border border-[#E5E7EB] bg-white p-3 shadow-lg sm:block">
        <div className="flex items-center gap-2">
          <span className="homepage-scan-pulse flex h-9 w-9 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
            <QrCode className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-[#111827]">Staff scanned QR</p>
            <p className="text-xs text-[#6B7280]">Stamp verified</p>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-2xl backdrop-blur-xl">
        <div className="rounded-[22px] bg-[linear-gradient(145deg,#111827,#1f2937_48%,#F97316_160%)] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/65">Mobile loyalty card</p>
              <h2 className="mt-2 text-2xl font-semibold">Coffee Club</h2>
              <p className="mt-1 text-sm text-white/60">Maya Hassan</p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-sm font-bold ring-1 ring-white/20">
              LB
            </span>
          </div>

          <div className="mt-7 rounded-2xl bg-white p-4 text-[#111827] shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-[#F97316]">
                  <Stamp className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase text-[#6B7280]">Stamp count</p>
                  <p className="homepage-journey-count mt-1 text-2xl font-semibold" aria-label="Stamp count animates from 1 out of 10 to 10 out of 10" />
                </div>
              </div>
              <span className="homepage-reward-badge rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#F97316]">
                Reward Ready
              </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-orange-100">
              <div className="homepage-journey-progress h-full rounded-full bg-[linear-gradient(90deg,#FDBA74,#F97316)]" />
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className="homepage-journey-stamp flex aspect-square items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-[#F97316]"
                  style={{ animationDelay: `${index * 0.34}s` }}
                >
                  <Coffee className="h-4 w-4" aria-hidden="true" />
                </span>
              ))}
            </div>

            <div className="homepage-unlock-panel mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center">
              <div className="homepage-confetti" aria-hidden="true">
                {Array.from({ length: 10 }).map((_, index) => (
                  <span key={index} style={{ left: `${8 + index * 9}%`, animationDelay: `${index * 0.07}s` }} />
                ))}
              </div>
              <p className="text-sm font-semibold text-[#F97316]">Congratulations</p>
              <p className="mt-1 text-xl font-semibold text-[#111827]">Free Coffee Unlocked</p>
              <button className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#F97316] px-4 text-sm font-semibold text-white" type="button">
                Redeem Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegionalNetwork() {
  return (
    <div className="homepage-reveal relative min-h-[500px] overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.12),transparent_38%)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 500" role="img" aria-label="Regional operations network centered on UAE">
        <line className="homepage-network-line" x1="300" y1="250" x2="265" y2="55" />
        <line className="homepage-network-line" x1="300" y1="250" x2="110" y2="165" />
        <line className="homepage-network-line" x1="300" y1="250" x2="190" y2="285" />
        <line className="homepage-network-line" x1="300" y1="250" x2="270" y2="405" />
        <line className="homepage-network-line" x1="300" y1="250" x2="500" y2="165" />
        <line className="homepage-network-line" x1="300" y1="250" x2="430" y2="315" />
        <line className="homepage-network-line" x1="300" y1="250" x2="520" y2="430" />
        <circle className="homepage-data-particle particle-one" r="5" />
        <circle className="homepage-data-particle particle-two" r="5" />
        <circle className="homepage-data-particle particle-three" r="5" />
      </svg>
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="homepage-hub flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#F97316] text-center text-white shadow-xl ring-8 ring-orange-100">
          <MapPin className="h-6 w-6" aria-hidden="true" />
          <span className="mt-1 text-sm font-bold">UAE</span>
          <span className="text-xs text-white/75">Hub</span>
        </div>
      </div>
      {regionNodes.map((node) => (
        <div key={node.name} className={`absolute z-10 ${node.className}`}>
          <div className="homepage-country-node rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-md">
            {node.name}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityTicker() {
  const repeated = [...activityItems, ...activityItems];

  return (
    <section className="border-y border-orange-100 bg-orange-50/70 py-4" aria-label="Live loyalty activity examples">
      <div className="homepage-ticker overflow-hidden">
        <div className="homepage-ticker-track flex w-max gap-3">
          {repeated.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm">
              <span className="text-[#F97316]">{getActivityIcon(index)}</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ value, label, delay, compact = false }: { value: string; label: string; delay: number; compact?: boolean }) {
  return (
    <div
      className={`homepage-count-up rounded-md border border-[#E5E7EB] bg-white shadow-sm ${compact ? "p-4" : "p-5"}`}
      style={{ animationDelay: `${delay * 0.12}s` }}
    >
      <p className={`${compact ? "text-2xl" : "text-3xl"} font-semibold tracking-tight text-[#F97316]`}>{value}</p>
      <p className="mt-2 text-sm font-medium text-[#6B7280]">{label}</p>
    </div>
  );
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="homepage-reveal max-w-3xl">
      <p className="text-sm font-semibold uppercase text-[#F97316]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-[#6B7280]">{description}</p>
    </div>
  );
}

function OutcomeCard({
  title,
  eyebrow,
  metric,
  description,
  icon: Icon,
  visual,
}: {
  title: string;
  eyebrow: string;
  metric: string;
  description: string;
  icon: LucideIcon;
  visual: string;
}) {
  return (
    <article className="homepage-benefit-card group overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#F97316] transition group-hover:bg-[#F97316] group-hover:text-white">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <BenefitVisual type={visual} />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-[#111827]">{title}</h3>
      <div className="mt-4 rounded-xl bg-[#FAFAFA] p-4">
        <p className="text-2xl font-semibold tracking-tight text-[#F97316]">{eyebrow}</p>
        <p className="mt-1 text-sm font-semibold text-[#111827]">{metric}</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#6B7280]">{description}</p>
    </article>
  );
}

function BenefitVisual({ type }: { type: string }) {
  if (type === "trend") {
    return <span className="homepage-mini-trend" aria-hidden="true" />;
  }

  if (type === "reward") {
    return (
      <span className="homepage-mini-reward" aria-hidden="true">
        <Gift className="h-4 w-4" />
      </span>
    );
  }

  if (type === "branches") {
    return <span className="homepage-mini-network" aria-hidden="true" />;
  }

  if (type === "shield") {
    return (
      <span className="homepage-mini-alert" aria-hidden="true">
        <ShieldAlert className="h-4 w-4" />
      </span>
    );
  }

  if (type === "referral") {
    return (
      <span className="homepage-mini-referral" aria-hidden="true">
        <Heart className="h-4 w-4" />
      </span>
    );
  }

  return <span className="homepage-mini-bars" aria-hidden="true" />;
}

function JourneyStep({ title, description, icon: Icon, index }: { title: string; description: string; icon: LucideIcon; index: number }) {
  return (
    <article className="homepage-journey-step group relative rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#F97316] transition group-hover:bg-[#F97316] group-hover:text-white">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold text-[#FDBA74]">0{index}</span>
      </div>
      <h3 className="mt-5 text-base font-semibold text-[#111827]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">{description}</p>
      {index < 5 ? (
        <span className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-orange-100 bg-white text-[#F97316] lg:flex">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : null}
    </article>
  );
}

function getActivityIcon(index: number) {
  const icons = ["☕", "✓", "🎁", "👥", "❤️", "⭐"];
  return icons[index % icons.length];
}
