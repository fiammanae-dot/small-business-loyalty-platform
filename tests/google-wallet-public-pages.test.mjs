import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

function expectText(file, expected) {
  for (const value of expected) {
    assert.match(file, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

test("Google Wallet review public pages exist with required support and legal content", () => {
  const support = read("src/app/support/page.tsx");
  const privacy = read("src/app/privacy/page.tsx");
  const terms = read("src/app/terms/page.tsx");
  const contact = read("src/app/contact/page.tsx");

  expectText(support, [
    'title: "Support"',
    "support@loyaltycarduae.com",
    "+971 50 500 9707",
    "Abu Dhabi, United Arab Emirates",
    "Monday to Friday, 9:00 AM - 6:00 PM Gulf Standard Time",
    "Google Wallet loyalty cards",
    "Apple Wallet loyalty cards",
    "business accounts",
    "Stamp issues",
    "Reward issues",
    "Technical support",
  ]);

  expectText(privacy, [
    'title: "Privacy Policy"',
    "Data we collect",
    "How loyalty card data is used",
    "Google Wallet and Apple Wallet pass usage",
    "support@loyaltycarduae.com",
    "Deletion and privacy requests",
  ]);

  expectText(terms, [
    'title: "Terms & Conditions"',
    "SaaS subscription terms",
    "Business user responsibilities",
    "Customer loyalty card usage",
    "Acceptable use",
    "Limitation of liability",
    "support@loyaltycarduae.com",
  ]);

  expectText(contact, [
    'title: "Contact"',
    "https://wa.me/971505009707",
    "support@loyaltycarduae.com",
    "Abu Dhabi, United Arab Emirates",
  ]);
});

test("homepage and marketing footer expose production review links and SaaS positioning", () => {
  const home = read("src/app/page.tsx");
  const marketingLayout = read("src/components/marketing/MarketingLayout.tsx");

  expectText(home, [
    "SaaS platform",
    "digital loyalty cards, stamps, points, and rewards",
    "/support",
    "/privacy",
    "/terms",
    "/contact",
  ]);

  expectText(marketingLayout, [
    "/support",
    "/privacy",
    "/terms",
    "/contact",
  ]);
});

test("public logo png exists for wallet provider review", () => {
  assert.equal(existsSync("public/logo.png"), true);
  assert.ok(statSync("public/logo.png").size > 1000, "public/logo.png should be a real PNG asset");
});
