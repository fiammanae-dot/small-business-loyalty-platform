import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFrame, PageHero } from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for Loyalty Card UAE SaaS subscriptions, business user responsibilities, customer loyalty cards, acceptable use, and liability.",
};

const terms = [
  {
    title: "SaaS subscription terms",
    body: "Loyalty Card UAE provides subscription-based access to digital loyalty card, scanner, staff, branch, reward, and customer engagement tools. Plan limits, pricing, renewal periods, and included features may vary by subscription. Businesses are responsible for keeping subscription and billing information accurate.",
  },
  {
    title: "Business user responsibilities",
    body: "Business owners and authorized staff are responsible for configuring loyalty programs accurately, issuing stamps only for valid customer activity, managing staff access, maintaining customer consent where required, and using the platform in accordance with applicable laws.",
  },
  {
    title: "Customer loyalty card usage",
    body: "Customer cards, QR codes, Google Wallet passes, Apple Wallet passes, stamps, rewards, and referrals are provided for loyalty participation with the issuing business. Rewards are controlled by the business that operates the loyalty program and may be subject to its own in-store rules.",
  },
  {
    title: "Acceptable use",
    body: "Users must not misuse the platform, attempt unauthorized access, interfere with scanning or reward systems, upload malicious content, spam customers, impersonate another business, or use Loyalty Card UAE for unlawful or abusive activity.",
  },
  {
    title: "Limitation of liability",
    body: "To the maximum extent permitted by law, Loyalty Card UAE is not liable for indirect, incidental, special, consequential, or lost-profit damages. The platform is provided as a SaaS service and may depend on third-party infrastructure, browsers, wallet providers, and communication providers.",
  },
  {
    title: "Changes and availability",
    body: "We may improve, update, suspend, or modify platform features to maintain security, compliance, reliability, or product quality. We aim to provide reliable service but cannot guarantee uninterrupted availability.",
  },
];

export default function TermsPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Terms & Conditions"
        title="Terms for using Loyalty Card UAE"
        description="These terms explain the responsibilities of businesses and users who operate digital loyalty programs through Loyalty Card UAE."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-[980px] gap-6">
          <p className="rounded-[24px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-7 text-[#607089]">
            Last updated: July 2026. These terms are written for business users, staff users, and customers interacting with loyalty cards issued through the platform.
          </p>
          {terms.map((term) => (
            <article key={term.title} className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#08111F]">{term.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[#607089]">{term.body}</p>
            </article>
          ))}
          <div className="rounded-[28px] bg-[#0B1220] p-6 text-white">
            <h2 className="text-2xl font-extrabold">Questions about these terms?</h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Contact <Link href="mailto:support@loyaltycarduae.com" className="font-bold text-orange-300">support@loyaltycarduae.com</Link> for terms, account, or subscription questions.
            </p>
          </div>
        </div>
      </section>
    </MarketingFrame>
  );
}
