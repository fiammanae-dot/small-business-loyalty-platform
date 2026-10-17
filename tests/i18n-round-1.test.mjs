import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(path, "utf8");

test("locale rules: two locales, cookie name, direction, Intl tag with Western digits", async () => {
  const locales = await loadTs("src/i18n/locales.ts");
  assert.deepEqual(locales.LOCALES, ["en", "ar"]);
  assert.equal(locales.LOCALE_COOKIE, "lc_lang");
  assert.equal(locales.resolveLocale("ar"), "ar");
  assert.equal(locales.resolveLocale("fr"), "en");
  assert.equal(locales.resolveLocale(undefined), "en");
  assert.equal(locales.directionFor("ar"), "rtl");
  assert.equal(locales.directionFor("en"), "ltr");
  assert.equal(locales.otherLocale("ar"), "en");
  assert.match(locales.intlTag("ar"), /^ar-AE-u-nu-latn$/);
  assert.equal(new Intl.NumberFormat(locales.intlTag("ar")).format(1234), "1,234");
});

test("translate: interpolation, English fallback, label lookup, Arabic dual", async () => {
  const { createTranslate, interpolate, pluralKey, translateLabel } = await loadTs("src/i18n/translate.ts");
  assert.equal(interpolate("Hi {name}, {count} stamps", { name: "Sara", count: 3 }), "Hi Sara, 3 stamps");
  const t = createTranslate({ a: "أ" }, { a: "A", b: "B" });
  assert.equal(t("a"), "أ");
  assert.equal(t("b"), "B");
  assert.equal(t("missing"), "missing");
  assert.equal(translateLabel(t, "nav", "Customers"), "Customers");
  assert.equal(pluralKey("ar", 2), "_two");
  assert.equal(pluralKey("en", 2), "_other");
  assert.equal(pluralKey("ar", 1), "_one");
});

test("English and Arabic dictionaries carry exactly the same keys, and Arabic is Arabic", async () => {
  const { en } = await loadTs("src/i18n/dictionaries/en.ts");
  const { ar } = await loadTs("src/i18n/dictionaries/ar.ts");
  const { missingKeys } = await loadTs("src/i18n/translate.ts");
  assert.deepEqual(missingKeys(en, ar), []);
  assert.deepEqual(missingKeys(ar, en), []);
  for (const [key, value] of Object.entries(ar)) {
    assert.ok(value.trim().length > 0, `${key} is empty`);
    if (key.startsWith("lang.")) continue;
    assert.match(value, /[؀-ۿ]/, `${key} has no Arabic text: ${value}`);
    assert.doesNotMatch(value, /[٠-٩]/, `${key} uses Eastern digits`);
    // Placeholders must survive translation.
    const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort();
    assert.deepEqual(placeholders(value), placeholders(en[key]), `${key} placeholders differ`);
  }
});

test("approved glossary terms are used in the dictionary", async () => {
  const { ar } = await loadTs("src/i18n/dictionaries/ar.ts");
  const glossary = read("src/i18n/GLOSSARY.md");
  assert.match(glossary, /Plan \(subscription\) \| خطة الدفع/);
  assert.equal(ar["nav.Dashboard"], "لوحة التحكم");
  assert.equal(ar["nav.Scanner"], "الماسح");
  assert.equal(ar["nav.Settings"], "الإعدادات");
  assert.equal(ar["nav.WhatsApp outreach"], "التواصل عبر واتساب");
  assert.equal(ar["common.save"], "حفظ");
  assert.equal(ar["shell.support"], "الدعم");
});

test("root layout sets lang and dir from the cookie and loads the Arabic font", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /const locale = await getLocale\(\)/);
  assert.match(layout, /lang=\{locale\}/);
  assert.match(layout, /dir=\{directionFor\(locale\)\}/);
  assert.match(layout, /variable: "--font-arabic"/);
  assert.match(layout, /IBMPlexSansArabic-400\.woff2/);
  assert.match(layout, /<I18nProvider locale=\{locale\}>/);
  const css = read("src/app/globals.css");
  assert.match(css, /html\[lang="ar"\] \{\s*--font-sans: var\(--font-arabic\)/);
  assert.match(css, /html\[lang="ar"\] \[class\*="tracking-"\] \{\s*letter-spacing: 0/);
  const server = read("src/i18n/server.ts");
  assert.match(server, /import "server-only"/);
  assert.match(server, /store\.get\(LOCALE_COOKIE\)/);
  const actions = read("src/i18n/actions.ts");
  assert.match(actions, /"use server"/);
  assert.match(actions, /resolveLocale\(locale\)/);
  assert.match(actions, /maxAge: LOCALE_COOKIE_MAX_AGE/);
});

test("language switch is on the login page and the business shell, not the platform side", () => {
  const login = read("src/app/login/page.tsx");
  const shell = read("src/components/DashboardShell.tsx");
  const switcher = read("src/components/LanguageSwitch.tsx");
  assert.match(login, /<LanguageSwitch/);
  assert.match(shell, /user\.role === "PLATFORM_OWNER" \? null : <LanguageSwitch \/>/);
  assert.match(switcher, /setLocaleAction\(otherLocale\(locale\)\)/);
  assert.match(switcher, /router\.refresh\(\)/);
});

test("shell, navigation, login and roles read their text from the dictionary", () => {
  const shell = read("src/components/DashboardShell.tsx");
  const nav = read("src/components/RoleNavigation.tsx");
  const loginForm = read("src/components/LoginForm.tsx");
  const loginPage = read("src/app/login/page.tsx");
  for (const [file, text] of [["DashboardShell", shell], ["RoleNavigation", nav], ["LoginForm", loginForm], ["login page", loginPage]]) {
    assert.doesNotMatch(text, />\s*(Logout|Welcome back|Business Workspace|Daily operations|More|Close|Sign in|Secure login)\s*</, `${file} still has hard-coded English`);
  }
  assert.match(shell, /t\("shell\.logout"\)/);
  assert.match(shell, /t\(`role\.\$\{user\.role\}`\)/);
  assert.match(nav, /translateLabel\(t, "nav", item\.label\)/);
  assert.match(loginForm, /t\("login\.submit"\)/);
  assert.match(loginForm, /pe-12/);
  assert.match(loginForm, /absolute end-2/);
  assert.doesNotMatch(loginForm, /\bpr-12\b|\bright-2\b/);
});
