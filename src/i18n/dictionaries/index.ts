import type { Locale } from "../locales";
import { createTranslate, type Dictionary, type Translate } from "../translate";
import { ar } from "./ar";
import { en } from "./en";

export const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function translateFor(locale: Locale): Translate {
  return createTranslate(dictionaries[locale], en);
}
