import Link from "next/link";
import HeroShowcase from "./_components/HeroShowcase";

const stats = [
  { icon: "Secure", value: "Protected", label: "Role-based access" },
  { icon: "QR", value: "Fast", label: "Scanner workflow" },
  { icon: "UAE", value: "Local", label: "Built for UAE teams" },
  { icon: "Live", value: "Ready", label: "Digital cards" },
];

const features = [
  {
    shape: "rounded-[4px] border-[2.5px]",
    title: "Digital loyalty cards",
    body: "Customers open a branded digital loyalty card instantly from a secure link. No app download, no plastic cards.",
  },
  {
    shape: "border-[2.5px]",
    title: "QR scanner workflow",
    body: "Staff scan customer cards, add visits, and redeem rewards with a cashier-friendly flow.",
  },
  {
    shape: "rounded-full border-[2.5px]",
    title: "Stamps, points, and rewards",
    body: "Run visit stamps, reward progress, referrals, tiers, and points-style loyalty experiences from one SaaS platform.",
  },
];

const sectors = [
  "Coffee shops",
  "Restaurants",
  "Barbershops",
  "Beauty salons",
  "Car care centers",
  "Retail stores",
];

const plans = [
  { name: "Starter", price: "AED 100", per: "/mo", note: "or AED 1000/year", feats: ["1 branch", "1 program", "Single-location shops"], popular: false },
  { name: "Growth", price: "AED 200", per: "/mo", note: "or AED 2000/year", feats: ["3 branches", "5 programs", "Active teams and multiple rewards"], popular: true },
  { name: "Multi Branch", price: "AED 3000", per: "/yr", note: "Yearly only", feats: ["10 branches", "15 programs", "Branch-level operations"], popular: false },
];

const navLinks = [
  { label: "Product", href: "/benefits" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "Company", href: "/company" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white font-sans text-slate-800">
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 md:px-[52px]">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Loyalty Card UAE home">
          <span className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center">
            <span className="h-[26px] w-[26px] rotate-45 rounded-[7px] bg-orange-500" />
            <span className="absolute h-2 w-2 rotate-45 rounded-[2px] bg-white" />
          </span>
          <span className="truncate text-[18px] font-extrabold tracking-tight sm:text-[23px]">Loyalty Card UAE</span>
        </Link>

        <nav className="hidden gap-8 text-[15px] font-medium text-slate-700 lg:flex" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-orange-600">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 text-[13px] sm:gap-4 sm:text-[15px]">
          <Link href="/login" className="rounded-lg px-2 py-2 font-semibold text-slate-700 transition hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
            Log in
          </Link>
          <Link href="/request-demo" className="rounded-xl bg-orange-500 px-3 py-2.5 font-bold text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:px-5 sm:py-3">
            <span className="hidden sm:inline">Start free trial</span>
            <span className="sm:hidden">Start</span>
          </Link>
        </div>
      </header>

      <section className="grid items-center gap-8 bg-gradient-to-b from-slate-50/50 to-white px-6 py-16 md:px-[52px] lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold tracking-wider text-orange-600">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] text-white">★</span>
            BUILT FOR SMALL BUSINESS
          </span>
          <h1 className="mb-6 text-5xl font-black leading-none tracking-tight md:text-[70px]">
            Loyal customers.
            <br />
            Real, repeat <span className="text-orange-500">growth.</span>
          </h1>
          <p className="mb-8 max-w-md text-lg leading-relaxed text-slate-500 md:text-xl">
            Loyalty Card UAE is a SaaS platform that helps UAE businesses create digital loyalty cards, stamps, points, and rewards in minutes.
          </p>
          <div className="mb-4 flex flex-wrap gap-3.5">
            <Link href="/request-demo" className="inline-flex items-center gap-2.5 rounded-xl bg-orange-500 px-7 py-4 text-base font-bold text-white transition-colors hover:bg-orange-600">
              Start free trial →
            </Link>
            <Link href="/request-demo" className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-6 py-4 text-base font-bold transition-colors hover:bg-slate-50">
              Book a demo <span className="text-slate-400">□</span>
            </Link>
          </div>
          <div className="mb-10 text-sm text-slate-400">No credit card required. Cancel anytime.</div>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {stats.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-[34px] min-w-[34px] items-center justify-center rounded-[9px] bg-slate-100 px-2 text-[10px] font-black text-orange-500">{item.icon}</div>
                <div>
                  <div className="text-[15px] font-extrabold">{item.value}</div>
                  <div className="text-[13px] text-slate-400">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <HeroShowcase />
      </section>

      <section className="border-t border-slate-100 px-6 pb-10 pt-8 md:px-[52px]">
        <p className="mb-6 text-center text-[15px] text-slate-500">Designed for local service, hospitality, and retail teams</p>
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-4 text-[15px] font-bold uppercase tracking-[0.16em] text-slate-300">
          <span>Coffee</span>
          <span>Restaurants</span>
          <span>Fitness</span>
          <span>Beauty</span>
          <span>Retail</span>
        </div>
      </section>

      <section className="bg-slate-50/60 px-6 py-[72px] md:px-[52px]">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3.5 text-[13px] font-extrabold uppercase tracking-[0.1em] text-orange-500">Product</div>
          <h2 className="mb-3.5 text-4xl font-black leading-tight tracking-tight">Everything your team needs to run loyalty in one place</h2>
          <p className="text-[17px] leading-relaxed text-slate-500">Launch cards, scan customers, track rewards, and understand what brings people back.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-[18px] border border-slate-100 bg-white p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
                <span className={`block h-5 w-5 border-orange-500 ${feature.shape}`} />
              </div>
              <h3 className="mb-2.5 text-xl font-extrabold">{feature.title}</h3>
              <p className="text-[15px] leading-relaxed text-slate-500">{feature.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/benefits" className="text-base font-bold text-orange-500">Explore product benefits →</Link>
        </div>
      </section>

      <section className="px-6 py-[72px] md:px-[52px]">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-3.5 text-[13px] font-extrabold uppercase tracking-[0.1em] text-orange-500">Solutions</div>
          <h2 className="text-4xl font-black leading-tight tracking-tight">Built for the businesses your customers visit every week</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-3.5">
          {sectors.map((sector) => (
            <Link key={sector} href="/solutions" className="rounded-full border border-slate-200 px-6 py-3 text-base font-bold transition hover:border-orange-200 hover:text-orange-600">
              {sector}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-50/60 px-6 py-[72px] md:px-[52px]">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <div className="mb-3.5 text-[13px] font-extrabold uppercase tracking-[0.1em] text-orange-500">Pricing</div>
          <h2 className="text-4xl font-black leading-tight tracking-tight">Simple plans for real local operations</h2>
        </div>
        <div className="mx-auto grid max-w-[1080px] gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-[18px] bg-white p-8 ${plan.popular ? "border-2 border-orange-500 shadow-[0_24px_50px_-24px_rgba(249,115,22,0.4)]" : "border border-slate-100"}`}>
              {plan.popular ? <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white">Popular</div> : null}
              <div className="mb-3.5 text-base font-extrabold">{plan.name}</div>
              <div className="text-[40px] font-black tracking-tight">
                {plan.price}
                <span className="text-base font-semibold text-slate-500">{plan.per}</span>
              </div>
              <div className="mb-5 text-sm text-slate-400">{plan.note}</div>
              <div className="mb-6 flex flex-col gap-2.5 text-[15px] text-slate-700">
                {plan.feats.map((feature) => (
                  <span key={feature} className="flex gap-2.5">
                    <span className="text-green-600">✓</span>
                    {feature}
                  </span>
                ))}
              </div>
              <Link href="/request-demo" className={`block rounded-xl py-3 text-center text-[15px] font-bold ${plan.popular ? "bg-orange-500 text-white transition-colors hover:bg-orange-600" : "border border-slate-200 transition-colors hover:bg-slate-50"}`}>
                Request demo
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-[56px] md:px-[52px]">
        <div className="mx-auto grid max-w-[1080px] gap-8 rounded-[24px] border border-slate-100 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:grid-cols-[0.9fr_1.1fr] md:p-9">
          <div>
            <div className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-orange-500">Frequently Asked Questions</div>
            <h2 className="text-3xl font-black leading-tight tracking-tight">Still have questions?</h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-500">
              Here are some of the most common questions from business owners.
            </p>
          </div>
          <div className="grid gap-4">
            {["Do my customers need an app?", "How long does setup take?", "Can I manage multiple branches?"].map((question) => (
              <div key={question} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs text-orange-600">?</span>
                {question}
              </div>
            ))}
            <Link href="/faq" className="inline-flex min-h-12 w-fit items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-black text-white transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
              View all FAQs →
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 md:px-[52px]">
        <div className="rounded-[24px] bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-16 text-center text-white">
          <h2 className="mx-auto mb-3.5 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-[44px]">
            Ready to launch loyalty that customers actually use?
          </h2>
          <p className="mb-7 text-lg text-orange-100">Give your team a clean QR workflow and give customers a digital card they can open instantly.</p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Link href="/request-demo" className="rounded-xl bg-white px-8 py-4 text-base font-extrabold text-orange-600">Start free trial →</Link>
            <Link href="/request-demo" className="rounded-xl border-[1.5px] border-white/50 px-7 py-4 text-base font-bold text-white">Book a demo</Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 px-6 pb-10 pt-14 text-slate-300 md:px-[52px]">
        <div className="mb-10 grid gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-[26px] w-[26px] rotate-45 rounded-[7px] bg-orange-500" />
              <span className="text-xl font-extrabold text-white">Loyalty Card UAE</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">Digital loyalty cards, QR scanning, referrals, tiers, and operations tools for UAE and GCC local businesses.</p>
          </div>
          <FooterColumn title="Website" items={[["Product", "/benefits"], ["Solutions", "/solutions"], ["Pricing", "/pricing"], ["Resources", "/resources"], ["Company", "/company"]]} />
          <FooterColumn title="Start" items={[["Request demo", "/request-demo"], ["FAQ", "/faq"], ["Support", "/support"], ["Log in", "/login"]]} />
          <FooterColumn title="Legal" items={[["Privacy Policy", "/privacy"], ["Terms & Conditions", "/terms"], ["Contact", "/contact"]]} />
          <FooterColumn title="Included" items={[["No customer app", "/benefits"], ["QR scanner workflow", "/benefits"], ["Business branding", "/benefits"], ["Secure workspaces", "/benefits"]]} />
        </div>
        <div className="flex flex-col justify-between gap-2 border-t border-slate-800 pt-[22px] text-[13px] text-slate-500 sm:flex-row">
          <span>© 2026 Loyalty Card UAE. All rights reserved.</span>
          <span>loyaltycarduae.com</span>
        </div>
      </footer>
    </main>
  );
}

function FooterColumn({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div>
      <div className="mb-4 text-[13px] font-extrabold uppercase tracking-wider text-white">{title}</div>
      <div className="flex flex-col gap-2.5 text-sm">
        {items.map(([label, href]) => (
          <Link key={label} href={href} className="transition hover:text-white">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
