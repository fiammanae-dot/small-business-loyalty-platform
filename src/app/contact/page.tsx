import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { MarketingFrame, PageHero, SectionHeading } from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Loyalty Card UAE for demos, business account questions, wallet loyalty card support, and platform assistance.",
};

export default function ContactPage() {
  return (
    <MarketingFrame>
      <PageHero
        eyebrow="Contact"
        title="Talk to Loyalty Card UAE"
        description="For demos, support, business accounts, wallet card questions, and technical help, contact our team directly."
      />

      <section className="px-5 py-16 sm:px-8 lg:px-16">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading eyebrow="Contact options" title="Choose the best way to reach us" description="No backend contact form is shown here. Use a real contact method or request a demo." />
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactCard icon={MessageCircle} title="WhatsApp" value="+971 50 500 9707" href="https://wa.me/971505009707" external />
            <ContactCard icon={Mail} title="Email" value="support@loyaltycarduae.com" href="mailto:support@loyaltycarduae.com" />
            <ContactCard icon={Phone} title="Book a demo" value="Request a guided product walkthrough" href="/request-demo" />
            <ContactCard icon={MapPin} title="Location" value="Abu Dhabi, United Arab Emirates" />
          </div>
        </div>
      </section>
    </MarketingFrame>
  );
}

function ContactCard({
  icon: Icon,
  title,
  value,
  href,
  external,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const card = (
    <div className="h-full rounded-[26px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_24px_60px_rgba(249,115,22,0.12)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#F97316]">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-[#08111F]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#607089]">{value}</p>
    </div>
  );

  return href ? (
    <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      {card}
    </Link>
  ) : (
    card
  );
}
