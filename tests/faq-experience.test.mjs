import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("faq page is a searchable knowledge center with categories and accessible accordions", () => {
  const page = read("src/app/faq/page.tsx");
  const faq = read("src/app/faq/_components/FaqKnowledgeCenter.tsx");

  assert.match(page, /FaqKnowledgeCenter/);
  assert.match(page, /MarketingFrame/);

  for (const expected of [
    "Help Center",
    "Answers before you launch loyalty.",
    "Search FAQs",
    "Search by topic, customer, branch, billing...",
    "General",
    "Getting Started",
    "Loyalty Programs",
    "Customers",
    "Staff & Branches",
    "Security",
    "Billing",
    "Support",
    "What is Loyalty Card UAE?",
    "Do my customers need an app?",
    "Can I manage multiple branches?",
    "Book a Demo",
    "Contact Us",
  ]) {
    assert.match(faq, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(faq, /useMemo/);
  assert.match(faq, /aria-expanded=\{open\}/);
  assert.match(faq, /aria-controls=\{panelId\}/);
  assert.match(faq, /hidden=\{!open\}/);
  assert.match(faq, /href="\/request-demo"/);
  assert.match(faq, /mailto:support@loyaltycarduae\.com/);
});

test("homepage uses a compact faq teaser that links to the dedicated faq page", () => {
  const home = read("src/app/page.tsx");

  for (const expected of [
    "Frequently Asked Questions",
    "Still have questions?",
    "Here are some of the most common questions from business owners.",
    "Do my customers need an app?",
    "How long does setup take?",
    "Can I manage multiple branches?",
    "View all FAQs",
    'href="/faq"',
  ]) {
    assert.match(home, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(home, /Clear answers before you launch/);
  assert.doesNotMatch(home, /<details open/);
});
