import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

const plans = [
  { name: "Starter", price: "AED 100/month", limits: ["1 branch", "1 program"] },
  { name: "Growth", price: "AED 200/month", limits: ["3 branches", "5 programs"], featured: true },
  { name: "Multi Branch", price: "AED 1000/year per branch", limits: ["10 branches", "15 programs"] },
];

const included = ["Referrals", "Customer tiers", "Reports", "CSV exports", "Branding"];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-[#1E293B]">
      <SimpleHeader />
      <section className="border-b border-[#F3F4F6] bg-[#FAFAFA] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#EA580C]">Simple pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827] sm:text-5xl">Start small, grow by branch</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#64748B]">Pricing lives on its own page so the homepage can stay short and conversion-focused.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-3xl border p-6 shadow-sm ${plan.featured ? "border-orange-200 bg-orange-50 shadow-orange-100" : "border-[#E5E7EB] bg-white"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#111827]">{plan.name}</h2>
                  <p className="mt-3 text-3xl font-semibold text-[#EA580C]">{plan.price}</p>
                </div>
                {plan.featured ? <span className="rounded-full bg-[#F97316] px-3 py-1 text-xs font-bold uppercase text-white">Popular</span> : null}
              </div>
              <div className="mt-6 grid gap-2">
                {plan.limits.map((limit) => (
                  <p key={limit} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#475569] shadow-sm">{limit}</p>
                ))}
              </div>
              <div className="mt-6 border-t border-orange-100 pt-5">
                <p className="text-sm font-semibold text-[#111827]">Included in every plan</p>
                <ul className="mt-4 grid gap-3 text-sm text-[#64748B]">
                  {included.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#F97316]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/request-demo" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-100 transition hover:brightness-95">
                Request Demo
              </Link>
            </div>
          ))}
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
          <Link href="/benefits" className="text-[#64748B] hover:text-[#EA580C]">Product</Link>
          <Link href="/request-demo" className="rounded-md bg-[#F97316] px-4 py-2 text-white">Request Demo</Link>
        </div>
      </div>
    </header>
  );
}

