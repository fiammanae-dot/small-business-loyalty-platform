/**
 * Fixes from the pre-launch walkthrough of every program on the live site.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("paid packages cannot be self-joined through a public link", () => {
  const page = read("src/app/join/program/[token]/page.tsx");
  assert.match(page, /if \(program\.isMembership\) \{\s*return \(\s*<JoinUnavailable/);
  const action = read("src/app/join/program/[token]/actions.ts");
  assert.match(action, /if \(program\.isMembership\) \{\s*fail\(parsed\.data\.token, t\("join\.error\.paidPackage"\)/);
  // No join QR / poster for packages on the owner and branch pages.
  assert.match(read("src/app/dashboard/programs/[id]/page.tsx"), /\{isMembership \? \(\s*\/\/ A paid package has no public join link/);
  assert.match(read("src/app/branch/programs/[id]/page.tsx"), /\{program\.isMembership \? \(\s*\/\/ Paid packages have no public join QR/);
  for (const poster of ["src/app/dashboard/programs/[id]/join-poster/page.tsx", "src/app/branch/programs/[id]/join-poster/page.tsx"]) {
    assert.match(read(poster), /if \(!program \|\| program\.isMembership\) \{/, poster);
  }
});

test("scanning a cashback-only customer's card opens their cashback at the counter", () => {
  const page = read("src/app/scan/[token]/page.tsx");
  assert.match(page, /if \(cashbackOnlySettings\?\.enabled\) \{/);
  assert.match(page, /<CashbackScanSection\s+token=\{token\}\s+joined=\{isCashbackMember\(cardMembership\)\}/);
  const actions = read("src/app/scan/actions.ts");
  assert.match(actions, /where: \{ cardToken: scanToken, status: "ACTIVE", cardStatus: "ACTIVE" \}/);
  // Tenant and branch checks still run for card tokens.
  assert.match(actions, /if \(membership\.businessId !== user\.businessId\) \{/);
});

test("scanner errors stay on screen and point to the reason field", () => {
  assert.match(read("src/components/AppToaster.tsx"), /if \(pathname\.startsWith\("\/scan\/"\)\) return;/);
  const page = read("src/app/scan/[token]/page.tsx");
  assert.match(page, /<details open=\{defaultOpen\}/);
  assert.match(page, /defaultOpen=\{Boolean\(qs\.error\)\}/);
});

test("card photos are drawn through the same-origin media route", () => {
  assert.ok(existsSync("src/app/api/media/route.ts"));
  const route = read("src/app/api/media/route.ts");
  assert.match(route, /const ALLOWED_FOLDERS = \["wallet-photos\/", "logos\/", "stamp-icons\/"\];/);
  assert.match(route, /if \(!isProxiableMediaUrl\(source\)\) return new NextResponse\("Not found", \{ status: 404 \}\);/);
  const card = read("src/components/wallet-pass/WalletPassCard.tsx");
  assert.match(card, /src=\{sameOriginImage\(banner\.url\)\}/);
  assert.doesNotMatch(card, /crossOrigin="anonymous"/);
});

test("customer page and scanner describe each customer correctly", () => {
  const detail = read("src/app/dashboard/customers/[id]/page.tsx");
  assert.match(detail, /\{membershipMode && hasPackage \? \(/);
  assert.match(detail, /value=\{activePrograms \+ \(inCashback \? 1 : 0\)\}/);
  assert.match(detail, /Add Cashback/);
  assert.match(detail, /Enroll in a Program/);
  const scan = read("src/app/scan/[token]/page.tsx");
  assert.match(scan, /label="Package"/);
  assert.match(scan, /isMembership \? "Visit recorded" : "Stamp added successfully"/);
  assert.match(scan, /isMembership \? "Undo Visit" : "Undo Stamp"/);
});

test("the Renew Membership panel uses the business's colours, not hard-coded amber", () => {
  const page = read("src/app/scan/[token]/page.tsx");
  const panel = page.slice(page.indexOf("function MembershipRenewPanel"), page.indexOf("function MembershipSessionsNote"));
  assert.doesNotMatch(panel, /amber-/);
  assert.match(panel, /className="business-button min-h-12 w-full/);
});
