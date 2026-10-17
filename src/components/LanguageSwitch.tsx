"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/i18n/actions";
import { useLocale, useT } from "@/i18n/client";
import { otherLocale } from "@/i18n/locales";

/** One button that flips the page to the other language (English <-> Arabic). */
export function LanguageSwitch({ className = "" }: { className?: string }) {
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
          await setLocaleAction(otherLocale(locale));
          router.refresh();
        })
      }
      className={`inline-flex h-9 items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F3F4F7] disabled:opacity-60 ${className}`}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      {t("lang.switchTo")}
    </button>
  );
}
