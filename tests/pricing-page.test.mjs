/**
 * The pricing page tells the truth about the plans: every plan has every
 * feature, the three differ only in branches, programs and staff logins, and
 * the prices match the plan rows the platform bills from.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const layout = readFileSync("src/components/marketing/MarketingLayout.tsx", "utf8");
const page = readFileSync("src/app/pricing/page.tsx", "utf8");

test("each plan card lists branches, programs and staff logins matching the plan limits", () => {
  for (const [name, branches, programs, staff] of [["Starter", "1 branch", "1 loyalty program", "3 staff logins"], ["Growth", "Up to 3 branches", "Up to 5 loyalty programs", "10 staff logins"], ["Multi Branch", "Up to 10 branches", "Up to 15 loyalty programs", "30 staff logins"]]) {
    const card = layout.slice(layout.indexOf(`name: "${name}"`), layout.indexOf("bestFor", layout.indexOf(`name: "${name}"`)));
    for (const limit of [branches, programs, staff, "Unlimited customers"]) assert.match(card, new RegExp(limit), `${name}: ${limit}`);
  }
  assert.match(layout, /\{plan\.limits\.map\(/);
});

test("the yearly price leads on every plan, with the monthly option underneath", () => {
  assert.match(layout, /name: "Starter",\s*price: "AED 1,000\/year",\s*annual: "or AED 100\/month"/);
  assert.match(layout, /name: "Growth",\s*price: "AED 2,000\/year",\s*annual: "or AED 200\/month"/);
  const home = readFileSync("src/app/page.tsx", "utf8");
  assert.match(home, /name: "Starter", price: "AED 1,000", per: "\/yr", note: "or AED 100\/month"/);
  assert.match(home, /name: "Growth", price: "AED 2,000", per: "\/yr", note: "or AED 200\/month"/);
  assert.match(layout, /name: "Multi Branch",\s*price: "AED 3,000\/year",\s*annual: "Billed yearly"/);
  for (const file of ["prisma/seed.js", "prisma/seed-pilot.js", "src/lib/seed-data.ts"]) {
    const source = readFileSync(file, "utf8");
    const multi = source.slice(source.indexOf('code: "MULTI_BRANCH"'));
    assert.match(multi, /annualPrice: "3000\.00"/, file);
  }
  assert.match(readFileSync("prisma/migrations/0070_multi_branch_price/migration.sql", "utf8"), /"annual_price" = 3000\.00[\s\S]*WHERE "code" = 'MULTI_BRANCH'/);
});

test("the page says every plan has the full platform and lists what that is", () => {
  assert.match(page, /includedInEveryPlan\.map\(/);
  assert.match(page, /Every plan has every feature/);
  for (const item of ["Apple Wallet and Google Wallet", "Stamp, package and cashback programs", "Customer tiers", "Referral rewards", "Alerts for unusual activity"]) {
    assert.match(layout, new RegExp(item), item);
  }
});
