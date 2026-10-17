import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(path, "utf8");

test("the customer's language is detected from the cookie, their record, then the phone", async () => {
  const { localeFromAcceptLanguage } = await loadTs("src/i18n/locales.ts");
  assert.equal(localeFromAcceptLanguage("ar-AE,ar;q=0.9,en;q=0.8"), "ar");
  assert.equal(localeFromAcceptLanguage("en-US,en;q=0.9,ar;q=0.8"), "en");
  assert.equal(localeFromAcceptLanguage("fr-FR,fr;q=0.9"), "en");
  assert.equal(localeFromAcceptLanguage(null), "en");
  const server = read("src/i18n/server.ts");
  assert.match(server, /export async function getVisitorLocale\(recorded\?: string \| null\)/);
  assert.match(server, /if \(isLocale\(recorded\)\) return recorded;/);
  assert.match(server, /localeFromAcceptLanguage\(\(await headers\(\)\)\.get\("accept-language"\)\)/);
  // Signed-in screens never guess from the browser: English until the switch is used.
  assert.match(server, /export async function getLocale\(\): Promise<Locale> \{\s*return \(await getChosenLocale\(\)\) \?\? DEFAULT_LOCALE;/);
});

test("the customer's choice is stored on the membership and written into the wallet passes", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0074_customer_locale/migration.sql");
  assert.match(schema, /preferredLocale\s+String\?\s+@map\("preferred_locale"\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "preferred_locale" TEXT;/);
  for (const file of ["src/app/join/program/[token]/actions.ts", "src/app/join/cashback/[token]/actions.ts"]) {
    const action = read(file);
    assert.match(action, /resolveLocale\(getString\(formData, "locale"\)/, `${file} reads the form's language`);
    assert.match(action, /preferredLocale: locale,/, `${file} records it on the new member`);
  }
  const apple = read("src/lib/walletwallet/mapper.ts");
  const google = read("src/lib/google-wallet/mapper.ts");
  assert.equal((apple.match(/locale: customer\.preferredLocale,/g) ?? []).length, 2, "Apple program + cashback passes");
  assert.equal((google.match(/locale: customer\.preferredLocale,/g) ?? []).length, 2, "Google program + cashback passes");
  const customerAction = read("src/i18n/customer-actions.ts");
  assert.match(customerAction, /data: \{ preferredLocale: chosen \}/);
  assert.match(customerAction, /syncAppleWalletAfterTierChange\(membership\.id\)/);
  assert.match(customerAction, /syncAppleWalletAfterCashbackChange\(membership\.id\)/);
});

test("wallet pass fields come out in Arabic for an Arabic customer", async () => {
  const { buildProgramPassView, buildCashbackPassView } = await loadTs("src/lib/wallet-pass-view.ts");
  const branding = { primaryColor: "#B5985E", secondaryColor: "#EFE6D4", backgroundColor: "#FAF9F5", textColor: "#2B2520", buttonColor: "#7C6233" };
  const program = { name: "Glow", isMembership: false, requiredStamps: 6 };
  const ar = buildProgramPassView({ businessName: "B", logoUrl: null, branding, program, customerName: "سارة", progress: 2, tierName: "Gold", reward: { ready: false, visitsToNext: 4 }, locale: "ar" });
  assert.equal(ar.header.label, "الزيارات");
  assert.equal(ar.header.value, "2 / 6");
  assert.deepEqual(ar.secondaryFields.map((f) => f.label), ["البرنامج", "المستوى", "العضو"]);
  assert.equal(ar.secondaryFields[1].value, "ذهبي");
  assert.equal(ar.google.secondary.value, "4 زيارات");
  assert.equal(ar.barcodeAltText, "امسح عند الدفع");
  const en = buildProgramPassView({ businessName: "B", logoUrl: null, branding, program, customerName: "Sara", progress: 2, reward: { ready: false, visitsToNext: 1 } });
  assert.equal(en.header.label, "Visits");
  assert.equal(en.google.secondary.value, "1 visit");
  const cash = buildCashbackPassView({ businessName: "B", logoUrl: null, branding, cashback: {}, customerName: "سارة", balance: "AED 25.00", locale: "ar" });
  assert.equal(cash.title, "كاش باك");
  assert.equal(cash.google.primary.label, "الرصيد");
  assert.equal(cash.memberLabel, "العضو");
});

test("customer-facing texts are translated and the referral reward sentence follows the language", async () => {
  const { describeReferralReward, toView } = await loadTs("src/lib/referral-settings-rules.ts");
  const base = { rewardType: "STAMPS", stampProgramId: 3, referrerStamps: 2, friendStamps: 1, referrerCashback: 0, friendCashback: 0, stampProgram: { id: 3, name: "Glow", active: true, isMembership: false } };
  assert.deepEqual(describeReferralReward(toView(base), "AED", "ar"), { referrer: "2 أختام إضافية في Glow", friend: "ختم إضافي في Glow" });
  assert.deepEqual(describeReferralReward(toView(base)), { referrer: "2 bonus stamps on Glow", friend: "1 bonus stamp on Glow" });
  const { buildWelcomeCardWhatsAppMessage } = await loadTs("src/lib/whatsapp-messages.ts");
  assert.match(buildWelcomeCardWhatsAppMessage({ businessName: "B", customerName: "سارة", cardUrl: "https://x", locale: "ar" }), /بطاقة الولاء الخاصة بك جاهزة/);
});

test("customer pages set their own lang/dir and carry the language switch", () => {
  for (const file of ["src/app/card/[token]/page.tsx", "src/app/join/program/[token]/page.tsx", "src/app/join/cashback/[token]/page.tsx", "src/app/referral/[code]/page.tsx"]) {
    const page = read(file);
    assert.match(page, /lang=\{locale\} dir=\{directionFor\(locale\)\}/, `${file} sets lang/dir`);
    assert.match(page, /<I18nProvider locale=\{locale\}>/, `${file} provides the language to client components`);
    assert.match(page, /<CustomerLanguageSwitch/, `${file} has the switch`);
    assert.doesNotMatch(page, />\s*(Join Program|Join Cashback|Save Your Card|Refer a friend|How it works)\s*</, `${file} still has hard-coded English`);
  }
  const card = read("src/app/card/[token]/page.tsx");
  assert.match(card, /getVisitorLocale\(membership\.preferredLocale\)/);
  assert.match(card, /<CustomerLanguageSwitch cardToken=\{token\} \/>/);
  const dictionaries = read("src/i18n/dictionaries/en.ts");
  for (const prefix of ["pass.", "tier.", "card.", "share.", "tierPanel.", "referralPanel.", "join.", "referral.", "businessType."]) {
    assert.ok(dictionaries.includes(`"${prefix}`), `dictionary has ${prefix} keys`);
  }
});
