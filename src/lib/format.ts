import { intlTag, type Locale } from "@/i18n/locales";

/** dd/mm/yyyy. Arabic keeps Western digits (see intlTag), so the digits match everywhere. */
export function formatDate(value: Date, locale: Locale = "en") {
  return new Intl.DateTimeFormat(intlTag(locale), {
    year: "numeric",
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

export function formatDateTime(value: Date, locale: Locale = "en") {
  return new Intl.DateTimeFormat(intlTag(locale), {
    year: "numeric",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatMoney(value: { toString(): string }) {
  return `$${Number(value.toString()).toFixed(2)}`;
}
