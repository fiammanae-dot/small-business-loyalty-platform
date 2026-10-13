import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, Menu } from "lucide-react";
import { BrandLockup } from "@/components/BrandLogo";

export const marketingNavItems = [
  { label: "Product", href: "/benefits" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "Company", href: "/company" },
];

/**
 * The three plans, as sold. Every plan has every feature; they differ only in
 * how many branches, programs and staff logins a business may have. Keep in
 * step with the plan rows in prisma/seed.js and the staff limits in migration
 * 0069.
 */
export const officialPlans = [
  {
    name: "Starter",
    price: "AED 100/month",
    annual: "or AED 1,000/year (save AED 200)",
    limits: ["1 branch", "1 loyalty program", "3 staff logins", "Unlimited customers"],
    bestFor: "A single shop, salon or clinic launching its first digital loyalty card.",
  },
  {
    name: "Growth",
    price: "AED 200/month",
    annual: "or AED 2,000/year (save AED 400)",
    limits: ["Up to 3 branches", "Up to 5 loyalty programs", "10 staff logins", "Unlimited customers"],
    bestFor: "A growing brand running stamps, packages or cashback side by side, with a team across branches.",
    featured: true,
  },
  {
    name: "Multi Branch",
    price: "AED 3,000/year",
    annual: "Billed yearly",
    limits: ["Up to 10 branches", "Up to 15 loyalty programs", "30 staff logins", "Unlimited customers"],
    bestFor: "Chains that need branch managers, branch-level reporting and one card across every location.",
  },
];

/** What every plan includes. The plans differ only in the limits above. */
export const includedInEveryPlan = [
  "Apple Wallet and Google Wallet cards, no app to install",
  "Stamp, package and cashback programs",
  "QR scanner on any phone, nothing to buy",
  "Customer tiers (Silver, Gold, VIP) worked out automatically",
  "Referral rewards for the customer and their friend",
  "Alerts for unusual activity, with owner and manager overrides",
  "Printable \"Scan to join\" poster and shareable join link",
  "Business dashboard with customer, visit and reward reports",
  "Your own logo, colours and stamp icon on every card",
  "CSV exports and WhatsApp sharing",
  "Support from the Loyalty Card UAE team",
  "Stamp undo and manager overrides, every one logged",
];

export function MarketingFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F6F8] p-0 text-[#0F172A] sm:p-2">
      <div className="min-h-screen overflow-hidden rounded-none border border-[#E5E7EB] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:rounded-[28px]">
        <PublicHeader />
        {children}
        <MarketingFooter />
      </div>
    </main>
  );
}

export function PublicHeader() {
  return (
    <header className="relative z-30 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-2 px-4 py-5 sm:gap-4 sm:px-8 sm:py-6 lg:px-16">
        <LogoLink />

        <nav className="hidden items-center gap-10 text-[15px] font-semibold text-[#111827] lg:flex" aria-label="Main navigation">
          {marketingNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[#F26A21] focus:outline-none focus:ring-2 focus:ring-[#F26A21] focus:ring-offset-4">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/login" className="hidden text-[15px] font-semibold text-[#111827] transition hover:text-[#F26A21] focus:outline-none focus:ring-2 focus:ring-[#F26A21] focus:ring-offset-4 lg:inline">
            Log in
          </Link>
          <Link href="/request-demo" className="inline-flex h-11 shrink-0 items-center justify-center rounded-[12px] bg-[#F26A21] px-3 text-[13px] font-bold text-white shadow-[0_12px_26px_rgba(242,106,33,0.22)] transition hover:bg-[#C2410C] focus:outline-none focus:ring-2 focus:ring-[#F26A21] focus:ring-offset-4 sm:h-12 sm:px-6 sm:text-[15px]">
            Start free trial
          </Link>
          <details className="group relative lg:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-white text-[#111827] shadow-sm transition hover:border-[#F26A21] hover:text-[#C2410C] focus:outline-none focus:ring-2 focus:ring-[#F26A21] focus:ring-offset-2 [&::-webkit-details-marker]:hidden" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[min(82vw,280px)] rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
              <nav className="grid gap-1 text-sm font-semibold text-[#334155]" aria-label="Mobile public navigation">
                <Link href="/login" className="rounded-xl px-4 py-3 text-[#111827] transition hover:bg-[#FFF7ED] hover:text-[#C2410C] focus:outline-none focus:ring-2 focus:ring-[#F26A21]">
                  Log in
                </Link>
                {marketingNavItems.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 transition hover:bg-[#FFF7ED] hover:text-[#C2410C] focus:outline-none focus:ring-2 focus:ring-[#F26A21]">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function LogoLink() {
  return (
    <Link href="/" className="flex min-w-0 items-center" aria-label="Loyalty Card UAE home">
      <BrandLockup className="h-10 w-auto sm:h-12" priority />
    </Link>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
}) {
  return (
    <section className="relative border-y border-[#EEF2F6] bg-[radial-gradient(circle_at_18%_12%,rgba(255,122,24,0.12),transparent_28%),linear-gradient(180deg,#FFFFFF,#FFFCF9)] px-5 py-16 sm:px-8 lg:px-16 lg:py-20">
      <div className={`mx-auto max-w-[1180px] ${align === "center" ? "text-center" : ""}`}>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#C2410C]">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] text-[#08111F] sm:text-6xl lg:text-7xl">{title}</h1>
        <p className={`mt-5 max-w-3xl text-lg leading-8 text-[#607089] sm:text-xl ${align === "center" ? "mx-auto" : ""}`}>{description}</p>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#C2410C]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#08111F] sm:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-lg leading-8 text-[#607089]">{description}</p> : null}
    </div>
  );
}

export function MarketingCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      {Icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#F26A21]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="mt-5 text-xl font-bold tracking-[-0.02em] text-[#111827]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#607089]">{description}</p>
      {children}
    </article>
  );
}

export function PricingPlanCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-5 ${compact ? "lg:grid-cols-3" : "lg:grid-cols-3"}`}>
      {officialPlans.map((plan) => (
        <article
          key={plan.name}
          className={`relative rounded-[30px] border p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)] ${
            plan.featured ? "border-orange-200 bg-[#FFF7ED]" : "border-[#E5E7EB] bg-white"
          }`}
        >
          {plan.featured ? <span className="absolute right-5 top-5 rounded-full bg-[#F26A21] px-3 py-1 text-xs font-bold uppercase text-white">Popular</span> : null}
          <h3 className="text-2xl font-extrabold tracking-[-0.03em] text-[#08111F]">{plan.name}</h3>
          <p className="mt-4 text-3xl font-extrabold text-[#C2410C]">{plan.price}</p>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">{plan.annual}</p>
          <ul className="mt-6 grid gap-2 text-sm font-semibold text-[#334155]">
            {plan.limits.map((limit) => (
              <li key={limit} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                {limit}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-6 text-[#607089]">{plan.bestFor}</p>
          <Link href="/request-demo" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#F26A21] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#C2410C] focus:outline-none focus:ring-2 focus:ring-[#F26A21] focus:ring-offset-2">
            Request Demo
          </Link>
        </article>
      ))}
    </div>
  );
}

export function CTASection({
  title = "Ready to launch loyalty that customers actually use?",
  description = "Give your team a clean QR workflow and give customers a digital card they can open instantly.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="px-5 py-16 sm:px-8 lg:px-16">
      <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[36px] bg-[#0B1220] p-8 text-white shadow-[0_26px_70px_rgba(15,23,42,0.18)] sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <div>
          <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">{title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">{description}</p>
        </div>
        <Link href="/request-demo" className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#F26A21] px-7 text-base font-bold text-white transition hover:bg-[#C2410C] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0B1220] lg:mt-0">
          Start free trial
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white px-5 py-10 sm:px-8 lg:px-16">
      <div className="mx-auto grid max-w-[1720px] gap-10 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <LogoLink />
          <p className="mt-4 max-w-md text-sm leading-6 text-[#64748B]">Digital loyalty cards, QR scanning, referrals, tiers, and operations tools for UAE and GCC local businesses.</p>
          <p className="mt-4 text-xs text-[#94A3B8]">Existing users can access their workspace through the direct login page.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FooterColumn title="Website" links={marketingNavItems} />
          <FooterColumn title="Start" links={[{ label: "Request Demo", href: "/request-demo" }, { label: "FAQ", href: "/faq" }, { label: "Support", href: "/support" }, { label: "Log in", href: "/login" }]} />
          <FooterColumn title="Legal" links={[{ label: "Privacy Policy", href: "/privacy" }, { label: "Terms & Conditions", href: "/terms" }, { label: "Contact", href: "/contact" }]} />
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Included</h3>
            <ul className="mt-4 grid gap-3 text-sm text-[#64748B]">
              {["No customer app", "QR scanner workflow", "Business branding", "Secure workspaces"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#F26A21]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-[#111827]">{title}</h3>
      <ul className="mt-4 grid gap-3 text-sm font-medium text-[#64748B]">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition hover:text-[#C2410C]">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
