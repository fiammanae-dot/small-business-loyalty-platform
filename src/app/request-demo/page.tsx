import Link from "next/link";
import { ArrowRight, Building2, Clock3, MessageSquare, ShieldCheck } from "lucide-react";
import { DemoRequestForm } from "@/components/DemoRequestForm";
import { MarketingFrame } from "@/components/marketing/MarketingLayout";

const notes = [
  { title: "Pilot-focused", description: "Share your business type, branch count, and loyalty goals.", icon: Building2 },
  { title: "Privacy-minded", description: "Share only the details needed to prepare a useful product conversation.", icon: ShieldCheck },
  { title: "Fast follow-up", description: "Use the details to prepare a practical LoyaltyBase launch conversation.", icon: Clock3 },
];

export default function RequestDemoPage() {
  return (
    <MarketingFrame>
      <section className="relative border-y border-[#EEF2F6] bg-[radial-gradient(circle_at_18%_12%,rgba(255,122,24,0.12),transparent_28%),linear-gradient(180deg,#FFFFFF,#FFFCF9)] px-5 py-16 sm:px-8 lg:px-16 lg:py-20">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,1fr)_500px] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#EA580C]">Request a walkthrough</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] text-[#08111F] sm:text-6xl lg:text-7xl">
              See how LoyaltyBase fits your business.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#607089] sm:text-xl">
              Walk through digital loyalty cards, QR scanner operations, referrals, customer tiers, and branch workflows with a product specialist.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {notes.map((note) => (
                <article key={note.title} className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
                  <note.icon className="h-6 w-6 text-[#F97316]" aria-hidden="true" />
                  <h2 className="mt-4 text-sm font-bold text-[#111827]">{note.title}</h2>
                  <p className="mt-2 text-xs leading-5 text-[#607089]">{note.description}</p>
                </article>
              ))}
            </div>
          </div>
          <DemoRequestForm />
        </div>
      </section>

      <section className="bg-[#FAFBFC] px-5 py-14 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-[980px] flex-col gap-5 rounded-[30px] border border-[#E5E7EB] bg-white p-7 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-extrabold text-[#111827]">Prefer to review the product first?</h2>
              <p className="mt-1 text-sm leading-6 text-[#607089]">Explore LoyaltyBase benefits before requesting a pilot conversation.</p>
            </div>
          </div>
          <Link href="/benefits" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] px-5 py-3 text-sm font-bold text-[#111827] transition hover:border-[#F97316] hover:text-[#EA580C]">
            View benefits <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </MarketingFrame>
  );
}
