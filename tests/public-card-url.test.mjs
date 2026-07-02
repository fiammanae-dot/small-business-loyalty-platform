import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("public card URLs use production-safe base URL resolution", () => {
  const appUrl = read("src/lib/app-url.ts");
  const customerCards = read("src/lib/customer-cards.ts");
  const referrals = read("src/lib/referrals.ts");
  const scan = read("src/lib/scan.ts");

  assert.match(appUrl, /NEXT_PUBLIC_APP_URL/);
  assert.match(appUrl, /NEXT_PUBLIC_SITE_URL/);
  assert.match(appUrl, /AUTH_URL/);
  assert.match(appUrl, /NEXTAUTH_URL/);
  assert.match(appUrl, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(appUrl, /VERCEL_URL/);
  assert.match(appUrl, /isProductionRuntime/);
  assert.match(appUrl, /isLocalOrPrivateBaseUrl/);
  assert.match(appUrl, /localhost or a private network address/);
  assert.ok(appUrl.includes("192\\.168"));
  assert.ok(appUrl.includes("127.0.0.1"));

  assert.match(customerCards, /getRequestBaseUrl/);
  assert.match(customerCards, /\/card\/\$\{token\}/);
  assert.match(referrals, /getBaseUrl\(\).*\/referral\//s);
  assert.match(scan, /getBaseUrl\(\).*\/scan\//s);
});

test("public customer card route handles unavailable cards without authentication", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");

  assert.doesNotMatch(publicCard, /requireRole|requireBusinessOwner|redirect\("\/login"\)/);
  assert.match(publicCard, /CardUnavailable/);
  assert.match(publicCard, /cardStatus !== "ACTIVE"/);
  assert.match(publicCard, /membership\.status !== "ACTIVE"/);
});
