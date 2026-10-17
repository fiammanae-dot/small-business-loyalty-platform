import "server-only";

import { cookies, headers } from "next/headers";
import { translateFor } from "./dictionaries";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localeFromAcceptLanguage, type Locale } from "./locales";

/** The language the viewer chose with the switch, or null before they choose. */
export async function getChosenLocale(): Promise<Locale | null> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : null;
}

/** Signed-in screens: the chosen language, English until the switch is used. */
export async function getLocale(): Promise<Locale> {
  return (await getChosenLocale()) ?? DEFAULT_LOCALE;
}

/**
 * Customer pages (join, card, referral): the chosen language, else what the
 * customer's record says (set when they joined), else the phone's language.
 * The page sets lang/dir on its own <main>, since the root layout only knows
 * the cookie.
 */
export async function getVisitorLocale(recorded?: string | null): Promise<Locale> {
  const chosen = await getChosenLocale();
  if (chosen) return chosen;
  if (isLocale(recorded)) return recorded;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

/** Server components: `const t = await getT(); t("shell.logout")`. */
export async function getT(locale?: Locale) {
  return translateFor(locale ?? (await getLocale()));
}
