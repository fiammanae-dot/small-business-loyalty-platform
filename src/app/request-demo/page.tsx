import Link from "next/link";
import { Building2, Clock3, MessageSquare, ShieldCheck } from "lucide-react";
import { DemoRequestForm } from "@/components/DemoRequestForm";

const notes = [
  { title: "Pilot-focused", description: "Tell us about your business, branch count, and loyalty goals.", icon: Building2 },
  { title: "Safe preview", description: "This form does not create records or send email until backend handling is approved.", icon: ShieldCheck },
  { title: "Fast follow-up", description: "Use the form details to prepare your first LoyaltyBase pilot conversation.", icon: Clock3 },
];

export default function RequestDemoPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#1E293B]">
      <PublicHeader />
      <section className="bg-gradient-to-b from-orange-50/80 to-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#EA580C]">Request Demo</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#111827] sm:text-5xl">
              See how LoyaltyBase can fit your business.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#64748B]">
              Share a few details and prepare a pilot conversation around digital stamp cards, QR scanner operations, referrals, customer tiers, and multi-branch workflows.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {notes.map((note) => (
                <article key={note.title} className="rounded-md border border-orange-100 bg-white p-4 shadow-sm">
                  <note.icon className="h-5 w-5 text-[#F97316]" aria-hidden="true" />
                  <h2 className="mt-3 text-sm font-semibold text-[#111827]">{note.title}</h2>
                  <p className="mt-2 text-xs leading-5 text-[#64748B]">{note.description}</p>
                </article>
              ))}
            </div>
          </div>
          <DemoRequestForm />
        </div>
      </section>
      <section className="border-t border-[#E5E7EB] bg-[#FAFAFA] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <MessageSquare className="mt-1 h-5 w-5 shrink-0 text-[#F97316]" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-[#111827]">Prefer to review benefits first?</h2>
              <p className="mt-1 text-sm text-[#64748B]">Learn what LoyaltyBase offers before requesting a pilot conversation.</p>
            </div>
          </div>
          <Link href="/benefits" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#EA580C]">
            View Benefits
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
          <Link href="/benefits" className="transition hover:text-[#F97316]">Benefits</Link>
          <Link href="/request-demo" className="text-[#EA580C]">Request Demo</Link>
        </nav>
        <Link href="/benefits" className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] transition hover:border-[#F97316] hover:text-[#EA580C]">Benefits</Link>
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
