import Link from "next/link";
import { BadgeCheck, Building2, CreditCard, Palette, QrCode, Share2, Smartphone, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const benefits: Array<{ title: string; description: string; icon: LucideIcon }> = [
  { title: "No customer app required", description: "Customers open their loyalty card from a simple mobile link. No app download, no account setup, no friction at the counter.", icon: Smartphone },
  { title: "Digital loyalty card", description: "Each customer receives a live digital card with current stamps, rewards, tier, referral code, and QR code.", icon: CreditCard },
  { title: "QR scanning", description: "Staff can scan customer cards to issue stamps and redeem rewards quickly, with manual fallback when needed.", icon: QrCode },
  { title: "Staff-friendly workflow", description: "Branch teams get focused tools for enrollment, scanning, and reward handling without complex back-office screens.", icon: Users },
  { title: "Customer referrals", description: "Business-specific referral codes help loyal customers bring new customers while rewards stay isolated per business.", icon: Share2 },
  { title: "Customer tiers", description: "Bronze, Silver, Gold, and VIP tiers help motivate repeat visits without exposing spend or internal analytics to customers.", icon: BadgeCheck },
  { title: "Multi-branch support", description: "Manage branches, staff, customers, programs, and activity across growing UAE and GCC operations.", icon: Building2 },
  { title: "Business branding", description: "Operational screens and public cards can reflect each business logo and colors while platform administration stays separate.", icon: Palette },
  { title: "Mobile-first experience", description: "Designed for phones at the counter, in the queue, and on the customer side of the loyalty journey.", icon: Sparkles },
];

export default function BenefitsPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#1E293B]">
      <PublicHeader />
      <section className="border-b border-orange-100 bg-gradient-to-b from-orange-50/70 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#EA580C]">Benefits</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#111827] sm:text-5xl">
            Loyalty software built for real small-business operations.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#64748B]">
            LoyaltyBase helps UAE and GCC businesses launch digital loyalty cards, scan QR codes, reward repeat visits, and understand customer activity without forcing customers to download an app.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/request-demo" className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#F97316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C]">
              Request a Demo
            </Link>
            <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#EA580C]">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="rounded-md border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-orange-50 text-[#F97316]">
                <benefit.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-[#111827]">{benefit.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#64748B]">{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-[#FAFAFA] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#EA580C]">Simple pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827]">Plans for small teams and growing branches.</h2>
          <p className="mt-4 text-base leading-7 text-[#64748B]">
            Start with one branch, then grow into multiple locations. LoyaltyBase keeps the differences simple: branch limits, program limits, price, and billing cycle.
          </p>
          <Link href="/request-demo" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#F97316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C]">
            Talk to us about your pilot
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="LoyaltyBase homepage">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">LB</span>
          <span className="truncate text-base font-semibold text-[#111827]">LoyaltyBase</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-[#64748B] md:flex" aria-label="Public navigation">
          <Link href="/" className="transition hover:text-[#F97316]">Home</Link>
          <Link href="/benefits" className="text-[#EA580C]">Benefits</Link>
          <Link href="/request-demo" className="transition hover:text-[#F97316]">Request Demo</Link>
        </nav>
        <Link href="/request-demo" className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#EA580C]">Request Demo</Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white px-4 py-8 text-sm text-[#64748B] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <p className="font-semibold text-[#111827]">LoyaltyBase</p>
        <p>Digital loyalty operations for UAE and GCC small businesses.</p>
        <p className="text-xs text-[#94A3B8]">Existing users can access their workspace through the direct login page.</p>
      </div>
    </footer>
  );
}
