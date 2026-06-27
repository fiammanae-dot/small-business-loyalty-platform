import Link from "next/link";
import { CircleHelp } from "lucide-react";

const faqs = [
  {
    question: "Is LoyaltyBase ready for real pilot businesses?",
    answer: "Yes. It supports controlled pilot operations with business setup, staff accounts, customer cards, scanner workflows, referrals, rewards, billing visibility, and audit trails.",
  },
  {
    question: "Does the homepage require an account?",
    answer: "No. The public site is focused on prospective businesses evaluating LoyaltyBase for a pilot.",
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

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-white text-[#1E293B]">
      <SimpleHeader />
      <section className="border-b border-[#F3F4F6] bg-[#FAFAFA] py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#EA580C]">FAQ</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827] sm:text-5xl">Questions before your first pilot</h1>
          <p className="mt-4 text-lg leading-8 text-[#64748B]">Short answers for the most common questions.</p>
        </div>
      </section>
      <section className="py-14">
        <div className="mx-auto grid max-w-4xl gap-4 px-4 sm:px-6 lg:px-8">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="flex gap-3">
                <CircleHelp className="mt-1 h-5 w-5 shrink-0 text-[#F97316]" />
                <div>
                  <h2 className="font-semibold text-[#111827]">{faq.question}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#64748B]">{faq.answer}</p>
                </div>
              </div>
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
          <Link href="/pricing" className="text-[#64748B] hover:text-[#EA580C]">Pricing</Link>
          <Link href="/request-demo" className="rounded-md bg-[#F97316] px-4 py-2 text-white">Request Demo</Link>
        </div>
      </div>
    </header>
  );
}

