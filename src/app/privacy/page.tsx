import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFrame, PageHero } from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Loyalty Card UAE, including business data, customer loyalty card data, wallet pass usage, and data deletion requests.",
};

const sections = [
  {
    title: "Data we collect",
    body: [
      "Business account data such as business name, branch details, owner and staff user details, subscription status, support requests, and operational settings.",
      "Customer loyalty data such as customer name, phone number, email when provided, loyalty card identifiers, program enrollment, stamps, rewards, referrals, card status, and activity history.",
      "Technical data such as login activity, audit records, scan events, device/browser signals, IP-derived security information, and error logs needed to operate and protect the platform.",
    ],
  },
  {
    title: "How loyalty card data is used",
    body: [
      "We use loyalty card data to create digital customer cards, show stamp and reward progress, process QR scans, support staff workflows, prevent abuse, and help businesses manage customer retention.",
      "Business users can view and manage only the data that belongs to their own business workspace. Customer records are isolated between businesses.",
    ],
  },
  {
    title: "Google Wallet and Apple Wallet pass usage",
    body: [
      "When a business enables or shares wallet-compatible loyalty cards, relevant pass data may be used to display the customer card in Google Wallet or Apple Wallet.",
      "Wallet pass information may include business name, logo, card identifier, reward or progress information, and links needed for the card to update or open securely.",
      "Google Wallet and Apple Wallet are operated by their respective providers. Their handling of wallet app data may also be subject to their own privacy policies and platform terms.",
    ],
  },
  {
    title: "How data is protected",
    body: [
      "Loyalty Card UAE uses secure authentication, role-based access, tenant isolation, audit logging, and operational controls designed to protect business and customer data.",
      "No system can be guaranteed perfectly secure, but we use reasonable technical and organizational safeguards for a SaaS loyalty platform.",
    ],
  },
  {
    title: "Deletion and privacy requests",
    body: [
      "Customers can ask the business that enrolled them to update or delete their loyalty profile. Businesses can contact Loyalty Card UAE for account-level assistance.",
      "For privacy requests, data deletion questions, or access requests, contact support@loyaltycarduae.com. Include the business name, customer phone or card reference if relevant, and the request type.",
      "We may need to retain limited records where required for security, audit, fraud prevention, legal compliance, or legitimate business operations.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Privacy Policy"
        title="How Loyalty Card UAE handles business and customer data"
        description="This policy explains what data is collected, how digital loyalty card data is used, and how to contact us for privacy or deletion requests."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-[980px] gap-6">
          <p className="rounded-[24px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 text-sm leading-7 text-[#607089]">
            Last updated: July 2026. Loyalty Card UAE is a digital loyalty SaaS platform for UAE businesses. This page is intended for production review readiness and customer transparency.
          </p>
          {sections.map((section) => (
            <article key={section.title} className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#08111F]">{section.title}</h2>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-[#607089]">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
          <div className="rounded-[28px] bg-[#0B1220] p-6 text-white">
            <h2 className="text-2xl font-extrabold">Privacy contact</h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Email <Link href="mailto:support@loyaltycarduae.com" className="font-bold text-orange-300">support@loyaltycarduae.com</Link> for privacy, deletion, access, or correction requests.
            </p>
          </div>
        </div>
      </section>
    </MarketingFrame>
  );
}
