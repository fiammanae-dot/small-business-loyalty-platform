"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, resolveLocale } from "./locales";

/** Remembers the viewer's language for a year; the page re-renders in it. */
export async function setLocaleAction(locale: string) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, resolveLocale(locale), { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" });
}
