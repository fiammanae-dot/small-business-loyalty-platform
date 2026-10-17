"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { translateFor } from "./dictionaries";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import type { Translate } from "./translate";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Wraps the app once (root layout) so client components can call useT(). */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => translateFor(locale), [locale]);
}
