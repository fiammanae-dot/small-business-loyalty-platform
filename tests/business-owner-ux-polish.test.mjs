import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("dashboard quick action labels keep single-line desktop affordance", () => {
  const page = read("src/app/dashboard/page.tsx");

  assert.match(page, /min-w-\[10rem\]/, "Quick action cards should have enough minimum width before text wraps");
  assert.match(page, /whitespace-nowrap text-lg font-semibold/, "Quick action labels should not break across words on desktop");
  assert.doesNotMatch(page, /break-words text-lg font-semibold/, "Quick action labels should not force multi-line wrapping");
});

test("referral center right column uses responsive no-clipping layout", () => {
  const page = read("src/app/dashboard/referrals/page.tsx");

  assert.match(page, /grid min-w-0 gap-5 xl:grid-cols-\[minmax\(0,1fr\)_minmax\(300px,420px\)\]/);
  assert.match(page, /<aside className="grid min-w-0 gap-5">/);
  assert.match(page, /truncate font-semibold text-\[#111827\]/, "Top referrer names should truncate safely inside cards");
});

test("business billing history does not expose broken download action", () => {
  const page = read("src/app/dashboard/billing/page.tsx");

  assert.doesNotMatch(page, /Download unavailable/);
  assert.doesNotMatch(page, /ActionMenu label="Actions"/);
  assert.match(page, /\["Invoice Number", "Date", "Amount", "Status"\]/, "Billing history desktop table should omit the unsupported action column");
});

test("alert analytics handles long source names and counts safely", () => {
  const page = read("src/app/dashboard/notifications/page.tsx");

  assert.match(page, /Top Alert Sources/);
  assert.match(page, /className="min-w-0 truncate text-\[#6B7280\]" title=\{row\.label\}/);
  assert.match(page, /className="w-8 shrink-0 text-right text-\[#111827\]"/);
  assert.match(page, /mt-1 h-2 overflow-hidden rounded-full/);
});

test("expanded alert details use responsive readable panels", () => {
  const page = read("src/app/dashboard/notifications/page.tsx");

  assert.match(page, /grid min-w-0 gap-4 border-t border-\[#E5E7EB\] pt-4 xl:grid-cols-2/);
  assert.match(page, /Business impact/);
  assert.match(page, /Customer details/);
  assert.match(page, /Staff details/);
  assert.match(page, /Branch details/);
  assert.match(page, /Activity timeline/);
  assert.match(page, /min-w-0 overflow-hidden rounded-md border/);
  assert.match(page, /break-words/);
  assert.doesNotMatch(page, /`r`n/);
  assert.doesNotMatch(page, /JSON\.stringify|debug payload/i);
});

