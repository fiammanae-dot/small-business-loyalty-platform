"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setCustomerLocaleAction } from "@/i18n/customer-actions";
import { useLocale, useT } from "@/i18n/client";
import { otherLocale } from "@/i18n/locales";

/**
 * The language button on customer pages (join, card, referral). On the card
 * it also records the choice on the customer, so their wallet pass follows.
 */
export function CustomerLanguageSwitch({ cardToken, className = "" }: { cardToken?: string; className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      lang={otherLocale(locale)}
      aria-label={t("lang.switchToAria")}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setCustomerLocaleAction(otherLocale(locale), cardToken);
          router.refresh();
        })
      }
      className={`inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white/90 px-3 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-white disabled:opacity-60 ${className}`}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      {t("lang.switchTo")}
    </button>
  );
}
