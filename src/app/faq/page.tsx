import { CircleHelp } from "lucide-react";
import { CTASection, MarketingFrame, PageHero } from "@/components/marketing/MarketingLayout";

const faqs = [
  {
    question: "Do customers need an app?",
    answer: "No. Customers open a secure digital loyalty card in their mobile browser. This keeps joining and returning simple.",
  },
  {
    question: "How does the QR scanner work?",
    answer: "Staff scan the customer's card QR code. Loyalty Card UAE opens the secure scanner workflow so the team can find the customer, add visits, or redeem rewards when allowed.",
  },
  {
    question: "Can one customer join multiple businesses?",
    answer: "Yes. Customer access is scoped by business workspace, so each business controls its own loyalty relationship and customer records.",
  },
  {
    question: "Can businesses use referrals?",
    answer: "Yes. Loyalty Card UAE supports referral links and referral tracking, with rewards qualifying after real customer activity.",
  },
  {
    question: "How do rewards work?",
    answer: "Businesses create visit-based loyalty programs. Customers progress toward the required visit count, then staff or managers redeem the reward based on permissions.",
  },
  {
    question: "Can staff add stamps?",
    answer: "Yes. Staff can issue stamps within their role permissions. Reward redemption remains controlled by the configured role rules.",
  },
  {
    question: "Does Loyalty Card UAE support branches?",
    answer: "Yes. Plans include branch limits, and operational activity can be organized by branch where the plan supports it.",
  },
  {
    question: "Is Apple Wallet supported?",
    answer: "Browser-based public cards are available today. Apple Wallet passes are not included in the current pilot experience.",
  },
  {
    question: "Is Google Wallet supported?",
    answer: "Customers can currently use mobile browser cards without installing an app. Google Wallet passes are not included in the current pilot experience.",
  },
  {
    question: "What plans are available?",
    answer: "The official plans are Starter, Growth, and Multi Branch. Pricing depends on branch and program limits.",
  },
  {
    question: "How does Loyalty Card UAE handle security?",
    answer: "The platform uses role-based access, business workspace isolation, protected scanner flows, and operational audit patterns for sensitive actions.",
  },
];

export default function FaqPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="FAQ"
        title="Answers for business owners before launch"
        description="Clear answers about customer cards, QR scanning, referrals, rewards, branches, pricing, mobile cards, and security."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-[980px] gap-4">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex gap-4">
                <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
                  <CircleHelp className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-[-0.02em] text-[#111827]">{faq.question}</h2>
                  <p className="mt-2 text-sm leading-7 text-[#607089]">{faq.answer}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CTASection title="Still have questions?" description="Book a Demo and review the workflow from customer join to reward redemption." />
    </MarketingFrame>
  );
}
