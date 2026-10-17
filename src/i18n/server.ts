import "server-only";

import { cookies } from "next/headers";
import { translateFor } from "./dictionaries";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./locales";

/** The viewer's language, from the cookie the language switch sets. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return resolveLocale(store.get(LOCALE_COOKIE)?.value);
}

/** Server components: `const t = await getT(); t("shell.logout")`. */
export async function getT() {
  return translateFor(await getLocale());
}
