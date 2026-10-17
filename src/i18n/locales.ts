/**
 * The platform speaks English and Arabic. The choice is a cookie, so it
 * follows the device (a receptionist's phone can be Arabic while the owner's
 * laptop is English) and needs no database column.
 */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lc_lang";
/** A year: the choice should outlive the session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Text direction for the <html dir> attribute. */
export function directionFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** The language's own name, for the switch (never translated). */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ar: "العربية" };

/** The other language: what the switch offers. */
export function otherLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

/** BCP 47 tag for Intl: Arabic as written in the UAE (Western digits, Arabic month names). */
export function intlTag(locale: Locale): string {
  return locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE";
}
