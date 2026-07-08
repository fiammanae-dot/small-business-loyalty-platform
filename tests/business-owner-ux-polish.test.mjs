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
  const layout = read("src/components/layouts/DashboardPageLayout.tsx");
  const button = read("src/components/ui/Button.tsx");

  assert.match(layout, /min-w-0 max-w-full space-y-5/, "Dashboard page layout should not allow children to widen the mobile viewport");
  assert.match(page, /grid min-w-0 gap-4 xl:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(0,1fr\)\]/, "Dashboard main content grid should allow columns to shrink on mobile");
  assert.match(button, /inline-flex min-w-0 items-center justify-center gap-2/, "Shared button/link component should keep icon and label on one line without overflow");
  assert.match(page, /ButtonLink href="\/dashboard\/scanner" variant="business" size="lg" leftIcon=\{<ScanLine/, "Desktop hero should expose an Open Scanner quick action");
  assert.match(page, /ButtonLink href="\/dashboard\/customers\/new" variant="outline" leftIcon=\{<UserPlus/, "Desktop hero should expose an Add Customer quick action");
  assert.match(page, /grid gap-2 md:hidden/, "Mobile quick actions should stack in their own compact grid");
});

test("dashboard search inputs avoid mobile browser zoom", () => {
  const page = read("src/app/dashboard/page.tsx");
  const searchBar = read("src/components/ui/SearchBar.tsx");

  assert.match(page, /text-base outline-none business-ring focus:ring-0 sm:text-sm/, "Dashboard quick search should use 16px mobile input text");
  assert.match(searchBar, /text-base placeholder:text-\[#94A3B8\] outline-none sm:text-sm/, "Shared SearchBar should avoid iOS input auto-zoom on mobile");
});

test("referral center uses stacked full-width sections and static how-it-works guide", () => {
  const page = read("src/app/dashboard/referrals/page.tsx");

  assert.match(page, /How referrals work/);
  assert.match(page, /HowStep n=\{1\} title="Invited"/);
  assert.doesNotMatch(page, /<aside className=/, "Referral Center should not keep a narrow permanent sidebar");
  assert.match(page, /<h2 className="text-base font-bold tracking-tight text-\[#171A21\]">Referrals /);
  assert.match(page, /<h2 className="text-base font-bold tracking-tight text-\[#171A21\]">Top referrers<\/h2>/);
  assert.match(page, /grid gap-3 md:grid-cols-2 xl:grid-cols-5/);
  assert.match(page, /take: 10/);
  assert.match(page, /No top referrers yet\./);
});

test("referral cards use compact responsive row layout", () => {
  const page = read("src/app/dashboard/referrals/page.tsx");

  assert.match(page, /function ReferralListRow/);
  assert.match(page, /className="truncate text-sm font-semibold text-\[#111827\]"/, "Referrer/referred name line should truncate instead of overflowing");
  assert.match(page, /className=\{`mt-0\.5 truncate text-xs/, "Referral meta line (code/date/branch) should truncate instead of overflowing");
  assert.match(page, /<StatusPill status=\{referral\.status\}/);
  assert.match(page, /\+\{latestReward\.bonusStamps\} stamp/, "Granted referral rewards should surface the bonus stamp count");
  assert.match(page, /flex shrink-0 flex-col items-end gap-1/, "Status/reward column should stay a fixed width on narrow screens");
});

test("business billing history does not expose broken download action", () => {
  const page = read("src/app/dashboard/billing/page.tsx");

  assert.doesNotMatch(page, /Download unavailable/);
  assert.doesNotMatch(page, /ActionMenu label="Actions"/);
  assert.match(page, /\["Invoice Number", "Date", "Amount", "Status"\]/, "Billing history desktop table should omit the unsupported action column");
});

test("alert analytics handles long source names and counts safely", () => {
  const page = read("src/app/dashboard/notifications/page.tsx");

  assert.match(page, /Top alert sources/);
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





