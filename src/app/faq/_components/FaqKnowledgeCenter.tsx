"use client";

import { ChevronDown, HelpCircle, Mail, Search } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";

type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: ReactNode;
};

type FaqCategory =
  | "General"
  | "Getting Started"
  | "Loyalty Programs"
  | "Customers"
  | "Staff & Branches"
  | "Security"
  | "Billing"
  | "Support";

const categories: FaqCategory[] = [
  "General",
  "Getting Started",
  "Loyalty Programs",
  "Customers",
  "Staff & Branches",
  "Security",
  "Billing",
  "Support",
];

const faqs: FaqItem[] = [
  {
    id: "what-is-loyalty-card-uae",
    category: "General",
    question: "What is Loyalty Card UAE?",
    answer: "Loyalty Card UAE helps businesses create digital loyalty programs that customers can use instantly from their phones without downloading an app.",
  },
  {
    id: "who-is-it-designed-for",
    category: "General",
    question: "Who is it designed for?",
    answer: "Perfect for salons, barber shops, cafes, restaurants, car washes, beauty clinics, fitness studios, pet grooming businesses, and any business that depends on repeat customers.",
  },
  {
    id: "setup-time",
    category: "Getting Started",
    question: "How long does setup take?",
    answer: "Most businesses create their first loyalty program and start enrolling customers in less than 10 minutes.",
  },
  {
    id: "customers-need-app",
    category: "Getting Started",
    question: "Do my customers need an app?",
    answer: (
      <>
        No.
        <br />
        Customers scan a QR code once and save their loyalty card to their phone. No app download is required.
      </>
    ),
  },
  {
    id: "staff-add-visits",
    category: "Getting Started",
    question: "How does my staff add visits?",
    answer: "Staff simply scan the customer's QR code using the built-in scanner and visits are added instantly.",
  },
  {
    id: "multiple-programs",
    category: "Loyalty Programs",
    question: "Can I create multiple loyalty programs?",
    answer: (
      <>
        Yes. One business can create multiple loyalty programs for different services or products.
        <br />
        <br />
        Examples include Hair Services, Nail Services, Coffee Rewards, Car Wash Packages, and Premium Membership.
      </>
    ),
  },
  {
    id: "customize-card",
    category: "Loyalty Programs",
    question: "Can I customize the loyalty card?",
    answer: (
      <>
        Yes. Customize logo, colors, background, stamp icons, reward style, progress display, and card layout.
        <br />
        <br />
        All changes appear instantly in the live preview.
      </>
    ),
  },
  {
    id: "customers-multiple-programs",
    category: "Customers",
    question: "Can customers join more than one loyalty program?",
    answer: (
      <>
        Yes. Each customer has one customer profile. Inside that profile they can join multiple loyalty programs.
        <br />
        <br />
        Each program tracks visits and rewards independently.
      </>
    ),
  },
  {
    id: "multiple-branches",
    category: "Staff & Branches",
    question: "Can I manage multiple branches?",
    answer: "Yes. Each branch can have its own staff while management can monitor activity across the business from one dashboard.",
  },
  {
    id: "staff-permissions",
    category: "Staff & Branches",
    question: "Can I control staff permissions?",
    answer: "Yes. Assign different roles and permissions so employees only access what they need.",
  },
  {
    id: "customer-data-secure",
    category: "Security",
    question: "Is customer data secure?",
    answer: "Yes. Customer data is isolated between businesses and protected using secure authentication and role-based permissions.",
  },
  {
    id: "business-isolation",
    category: "Security",
    question: "Can other businesses access my customers?",
    answer: "No. Each business has completely isolated customer records.",
  },
  {
    id: "cancel-anytime",
    category: "Billing",
    question: "Can I cancel anytime?",
    answer: "Yes. There are no long-term contracts. Upgrade, downgrade, or cancel whenever you need.",
  },
  {
    id: "setup-support",
    category: "Support",
    question: "Can you help us set everything up?",
    answer: "Yes. Our team can assist with onboarding, setup, and best practices to help you launch successfully.",
  },
];

export function FaqKnowledgeCenter() {
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("General");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(faqs[0]?.id ?? "");

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return faqs.filter((faq) => {
      const categoryMatches = faq.category === activeCategory;
      if (!categoryMatches) return false;
      if (!normalizedQuery) return true;
      const answerText = typeof faq.answer === "string" ? faq.answer : "";
      return `${faq.question} ${answerText} ${faq.category}`.toLowerCase().includes(normalizedQuery);
    });
  }, [activeCategory, query]);

  const totalMatching = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return faqs.length;
    return faqs.filter((faq) => {
      const answerText = typeof faq.answer === "string" ? faq.answer : "";
      return `${faq.question} ${answerText} ${faq.category}`.toLowerCase().includes(normalizedQuery);
    }).length;
  }, [query]);

  return (
    <div>
      <section className="border-b border-[#EEF2F6] bg-[radial-gradient(circle_at_20%_15%,rgba(249,115,22,0.10),transparent_32%),linear-gradient(180deg,#FFFFFF,#F8FAFC)] px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#F97316] shadow-sm">
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              Help Center
            </span>
            <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-tight text-[#0F172A] md:text-[70px]">
              Answers before you launch loyalty.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#607089]">
              Learn how Loyalty Card UAE works for business owners, staff, branches, customers, security, billing, and onboarding.
            </p>
          </div>

          <label className="relative mt-10 block max-w-2xl">
            <span className="sr-only">Search FAQs</span>
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by topic, customer, branch, billing..."
              className="h-16 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-14 pr-5 text-base font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
            />
          </label>
          <p className="mt-3 text-sm font-medium text-[#64748B]">
            {query.trim() ? `${totalMatching} matching question${totalMatching === 1 ? "" : "s"} across all categories.` : "Browse by category or search instantly."}
          </p>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-[28px] border border-[#E5E7EB] bg-white p-3 shadow-sm">
              <p className="px-3 pb-2 pt-1 text-xs font-black uppercase tracking-[0.16em] text-[#94A3B8]">Categories</p>
              <nav className="grid gap-1" aria-label="FAQ categories">
                {categories.map((category) => (
                  <CategoryButton key={category} category={category} active={activeCategory === category} onClick={() => setActiveCategory(category)} />
                ))}
              </nav>
            </div>
          </aside>

          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2" aria-label="FAQ categories">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 ${
                    activeCategory === category ? "border-[#F97316] bg-[#F97316] text-white" : "border-[#E5E7EB] bg-white text-[#334155]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#F97316]">{activeCategory}</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-[#111827]">Frequently Asked Questions</h2>
              </div>
              <p className="text-sm font-semibold text-[#64748B]">{filteredFaqs.length} question{filteredFaqs.length === 1 ? "" : "s"}</p>
            </div>

            <div className="grid gap-3">
              {filteredFaqs.map((faq) => {
                const open = openId === faq.id;
                const panelId = `${faq.id}-answer`;
                return (
                  <article key={faq.id} className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenId(open ? "" : faq.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-[#FFF7ED] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#F97316] sm:px-6"
                    >
                      <span className="text-base font-black tracking-tight text-[#111827] sm:text-lg">{faq.question}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-[#F97316] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    <div id={panelId} hidden={!open} className="border-t border-[#EEF2F6] px-5 py-5 sm:px-6">
                      <div className="max-w-3xl text-sm leading-7 text-[#607089] sm:text-base">{faq.answer}</div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
                <p className="text-lg font-black text-[#111827]">No questions found in this category.</p>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">Try another keyword or choose a different category.</p>
                <button type="button" onClick={() => setQuery("")} className="mt-5 rounded-xl bg-[#F97316] px-5 py-3 text-sm font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
                  Clear search
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 rounded-[32px] bg-[#111827] p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-orange-300">Still have questions?</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Our team is happy to help.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Book a demo or contact us and we will walk you through the best setup for your business.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/request-demo" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#F97316] px-6 text-sm font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#111827]">
              Book a Demo
            </Link>
            <Link href="mailto:support@loyaltycarduae.com" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 text-sm font-black text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#111827]">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryButton({ category, active, onClick }: { category: FaqCategory; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 ${
        active ? "bg-[#F97316] text-white shadow-sm" : "text-[#334155] hover:bg-[#FFF7ED] hover:text-[#EA580C]"
      }`}
    >
      {category}
    </button>
  );
}
