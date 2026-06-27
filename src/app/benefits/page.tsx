import Link from "next/link";
import { BarChart3, CheckCircle2, Coffee, Car, Gift, MessageSquare, QrCode, ScanLine, Scissors, ShieldCheck, ShoppingBag, Sparkles, Store, Utensils, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const sections = [
  {
    eyebrow: "Customer journey",
    title: "How customers use LoyaltyBase",
    items: [
      { title: "Join by QR", description: "Customers scan or receive a secure loyalty card link.", icon: QrCode },
      { title: "Open digital card", description: "No app download. The card opens on any mobile browser.", icon: Gift },
      { title: "Staff adds stamp", description: "Your team scans the card and records each visit quickly.", icon: ScanLine },
      { title: "Reward unlocked", description: "Customers see when the next reward is ready.", icon: CheckCircle2 },
      { title: "Customer returns again", description: "Simple rewards keep repeat visits easy to remember.", icon: Users },
    ],
  },
  {
    eyebrow: "Local businesses",
    title: "Built for local businesses",
    items: [
      { title: "Coffee shops", description: "Repeat visits, drink rewards, and mobile QR scans.", icon: Coffee },
      { title: "Restaurants", description: "Simple return-customer rewards and table-friendly cards.", icon: Utensils },
      { title: "Barbershops", description: "Visit-based loyalty for services and haircuts.", icon: Scissors },
      { title: "Beauty salons", description: "Elegant loyalty for premium service businesses.", icon: Sparkles },
      { title: "Car care centers", description: "Service-based repeat customer tracking and rewards.", icon: Car },
      { title: "Retail stores", description: "Keep customers coming back with lightweight digital cards.", icon: ShoppingBag },
    ],
  },
  {
    eyebrow: "Product value",
    title: "What the platform helps your team do",
    items: [
      { title: "Digital stamp cards", description: "Create clean loyalty programs customers can open from any phone.", icon: Gift },
      { title: "QR scanner operations", description: "Staff scan customer cards, issue stamps, and keep branch activity organized.", icon: ScanLine },
      { title: "Retention insights", description: "Track repeat visits, reward-ready customers, referrals, and program activity.", icon: BarChart3 },
      { title: "Fraud and risk alerts", description: "Detect unusual stamp activity, cooldown violations, and suspicious behavior.", icon: ShieldCheck },
      { title: "Referral growth", description: "Let loyal customers invite new customers and qualify rewards after real activity.", icon: Users },
      { title: "Message preparation", description: "Prepare WhatsApp-ready loyalty messages without sending real provider traffic yet.", icon: MessageSquare },
    ],
  },
];

export default function BenefitsPage() {
  return (
    <main className="min-h-screen bg-white text-[#1E293B]">
      <SimpleHeader />
      <section className="border-b border-[#F3F4F6] bg-[#FAFAFA] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#EA580C]">Product</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827] sm:text-5xl">Everything in one place, without a long homepage</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#64748B]">This page holds the deeper product explanation, customer journey, and use cases so the homepage stays short and focused.</p>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.title} className="border-b border-[#F3F4F6] py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#EA580C]">{section.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">{section.title}</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#F97316]">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-[#111827]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap gap-3">
          <Link href="/pricing" className="rounded-full bg-[#F97316] px-4 py-2 text-sm font-semibold text-white">View pricing</Link>
          <Link href="/request-demo" className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#111827]">Request demo</Link>
        </div>
      </section>
    </main>
  );
}

function SimpleHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">LB</span>
          <span className="text-base font-semibold text-[#111827]">LoyaltyBase</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/pricing" className="text-[#64748B] hover:text-[#EA580C]">Pricing</Link>
          <Link href="/request-demo" className="rounded-md bg-[#F97316] px-4 py-2 text-white">Request Demo</Link>
        </div>
      </div>
    </header>
  );
}

