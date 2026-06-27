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

  assert.match(page, /grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 min-\[1180px\]:grid-cols-4/, "Quick action cards should use equal responsive grid tracks");
  assert.match(page, /flex min-h-24 w-full min-w-0 items-center gap-3/, "Quick action cards should fill their grid track without fixed overflow");
  assert.match(page, /shrink-0 items-center justify-center/, "Quick action icons should remain fixed size");
  assert.match(page, /sm:whitespace-nowrap/, "Quick action labels should stay on one line on desktop while allowing mobile wrapping");
  assert.doesNotMatch(page, /break-words text-lg font-semibold/, "Quick action labels should not force multi-line wrapping");
});

test("referral center uses stacked full-width sections and help dialog", () => {
  const page = read("src/app/dashboard/referrals/page.tsx");

  assert.match(page, /How referrals work/);
  assert.match(page, /role="dialog" aria-label="How referrals work"/);
  assert.doesNotMatch(page, /<aside className=/, "Referral Center should not keep a narrow permanent sidebar");
  assert.doesNotMatch(page, /<h2 className="text-lg font-semibold text-\[#111827\]">Growth Funnel<\/h2>/, "Growth Funnel should not occupy permanent dashboard space");
  assert.match(page, /<h2 className="text-lg font-semibold text-\[#111827\]">Referral List<\/h2>/);
  assert.match(page, /<h2 className="text-lg font-semibold text-\[#111827\]">Top Referrers<\/h2>/);
  assert.match(page, /grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5/);
  assert.match(page, /take: 10/);
  assert.match(page, /No top referrers yet\./);
});

test("referral cards use compact responsive metadata grid", () => {
  const page = read("src/app/dashboard/referrals/page.tsx");

  assert.match(page, /<dl className="mt-5 grid min-w-0 gap-3 text-sm text-\[#6B7280\] lg:grid-cols-2">/);
  for (const label of ["Created", "Qualified", "Reward", "First Visit", "Branch", "Referrer", "Referred"]) {
    assert.match(page, new RegExp(`ReferralMeta label="${label}"`));
  }
  assert.match(page, /<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-\[#9CA3AF\]">Actions<\/p>/);
  assert.match(page, /flex min-w-0 flex-wrap items-center gap-2/);
  assert.match(page, /inline-flex h-10 shrink-0 items-center justify-center/);
  assert.match(page, /whitespace-normal break-words font-medium leading-5/);
  assert.doesNotMatch(page, /<dd className="mt-1 truncate/);
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





