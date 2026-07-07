import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { MarketingFrame, PageHero, SectionHeading } from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Support",
  description: "Contact Loyalty Card UAE support for Google Wallet loyalty cards, Apple Wallet loyalty cards, business accounts, stamps, rewards, and technical help.",
};

const contactDetails = [
  { label: "Email", value: "support@loyaltycarduae.com", href: "mailto:support@loyaltycarduae.com", icon: Mail },
  { label: "Phone / WhatsApp", value: "+971 50 500 9707", href: "https://wa.me/971505009707", icon: Phone },
  { label: "Location", value: "Abu Dhabi, United Arab Emirates", icon: MapPin },
  { label: "Business hours", value: "Monday to Friday, 9:00 AM - 6:00 PM Gulf Standard Time", icon: Clock },
];

const helpTopics = [
  "Google Wallet loyalty cards",
  "Apple Wallet loyalty cards",
  "Business accounts",
  "Stamp issues",
  "Reward issues",
  "Technical support",
];

export default function SupportPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Support"
        title="Support for Loyalty Card UAE businesses"
        description="Get help with digital loyalty cards, wallet passes, staff scanning, customer cards, stamps, rewards, and account setup."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionHeading eyebrow="Contact" title="Reach the support team" description="Use email or WhatsApp for account, wallet, or technical support. We do not ask for passwords or full payment details over support channels." />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="https://wa.me/971505009707" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF5A0A] px-6 text-sm font-bold text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp Support
              </Link>
              <Link href="mailto:support@loyaltycarduae.com" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-6 text-sm font-bold text-[#111827] transition hover:bg-[#FFF7ED] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
                Email Support
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {contactDetails.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="flex gap-4 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#94A3B8]">{item.label}</p>
                    <p className="mt-1 text-base font-bold text-[#111827]">{item.value}</p>
                  </div>
                </div>
              );
              return item.href ? (
                <Link key={item.label} href={item.href} target={item.href.startsWith("https://") ? "_blank" : undefined} rel={item.href.startsWith("https://") ? "noopener noreferrer" : undefined}>
                  {content}
                </Link>
              ) : (
                <div key={item.label}>{content}</div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-[#EEF2F6] bg-[#FAFBFC] px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <SectionHeading eyebrow="Help topics" title="What we can help with" description="Our team supports business owners and operators using Loyalty Card UAE." />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {helpTopics.map((topic) => (
              <div key={topic} className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 text-sm font-bold text-[#111827] shadow-sm">
                {topic}
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingFrame>
  );
}
