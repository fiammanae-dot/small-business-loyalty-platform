/**
 * Pure translation helpers: look a key up in a dictionary and fill in
 * {placeholders}. Missing keys fall back to the English text, then to the
 * key itself, so a forgotten translation never blanks a label.
 */
import type { Locale } from "./locales";

export type Dictionary = Record<string, string>;
export type Vars = Record<string, string | number>;

export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export type Translate = {
  (key: string, vars?: Vars): string;
  /** Picks key_one / key_two / key_other for the count and fills {count}. */
  plural: (key: string, count: number, vars?: Vars) => string;
  locale: Locale;
};

export function createTranslate(dictionary: Dictionary, fallback: Dictionary, locale: Locale = "en"): Translate {
  const lookup = (key: string) => dictionary[key] ?? fallback[key] ?? key;
  const t = ((key: string, vars?: Vars) => interpolate(lookup(key), vars)) as Translate;
  t.plural = (key, count, vars) => {
    const suffix = pluralKey(locale, count);
    const text = dictionary[key + suffix] ?? dictionary[key + "_other"] ?? fallback[key + suffix] ?? fallback[key + "_other"] ?? key;
    return interpolate(text, { count, ...vars });
  };
  t.locale = locale;
  return t;
}

/**
 * For labels that live in code as English text (menu items, enum labels):
 * translate when a "prefix.<label>" key exists, otherwise show the English.
 */
export function translateLabel(t: Translate, prefix: string, label: string): string {
  const key = `${prefix}.${label}`;
  const value = t(key);
  return value === key ? label : value;
}

/** Arabic plural forms differ from English; keys end in _one / _two / _other. */
export function pluralKey(locale: Locale, count: number): "_one" | "_two" | "_other" {
  if (count === 1) return "_one";
  if (locale === "ar" && count === 2) return "_two";
  return "_other";
}

/** Dictionaries must carry exactly the same keys (the tests enforce it). */
export function missingKeys(source: Dictionary, target: Dictionary): string[] {
  return Object.keys(source).filter((key) => !(key in target));
}
