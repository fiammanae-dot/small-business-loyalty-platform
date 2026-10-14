import { MessageCircle } from "lucide-react";

/** The sales WhatsApp number shown across the public website. */
export const WEBSITE_WHATSAPP_NUMBER = "971505009707";
const GREETING = "Hello Loyalty Card UAE, I'd like to know more about the digital loyalty card for my business.";
export const WEBSITE_WHATSAPP_URL = `https://wa.me/${WEBSITE_WHATSAPP_NUMBER}?text=${encodeURIComponent(GREETING)}`;

/**
 * Floating "Chat on WhatsApp" button for the public website, the same shape as
 * the support button business owners already see in their dashboard. Opens a
 * WhatsApp chat with the greeting pre-filled so a visitor only has to press send.
 */
export function WhatsAppFloat() {
  return (
    <a
      href={WEBSITE_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Loyalty Card UAE on WhatsApp"
      title="Chat with us on WhatsApp"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-[#1EBE5D] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/30 md:bottom-6 md:right-6"
    >
      <MessageCircle aria-hidden="true" className="h-6 w-6" />
      <span className="hidden whitespace-nowrap md:inline">Chat on WhatsApp</span>
    </a>
  );
}
