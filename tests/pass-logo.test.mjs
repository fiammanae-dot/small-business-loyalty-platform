/**
 * Brand logo on passes: trimmed of empty margin and sized per wallet, so it
 * fills Apple's 160 x 50 pt logo box and Google's circle; bigger on the web card.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("platform logos get a trimmed per-wallet copy; others are used as uploaded", () => {
  const lib = read("src/lib/wallet/pass-logo.ts");
  assert.match(lib, /url\.startsWith\(`\$\{storage\}\/logos\/`\)/);
  assert.match(lib, /\/uploads\/logos\//);
  assert.match(lib, /\/api\/wallet\/logo\/\$\{input\.businessUuid\}\/\$\{input\.shape\}\.png\?v=\$\{version\}/);
  assert.match(lib, /\.trim\(\{ threshold: 12 \}\)/);
  assert.match(lib, /resize\(\{ width: 480, height: 150, fit: "inside"/);
  // Google: the logo's diagonal fits inside the circle, so wide logos are never clipped.
  assert.match(lib, /Math\.hypot\(info\.width, info\.height\)/);
});

test("the logo route only processes the business's own stored logo", () => {
  const path = "src/app/api/wallet/logo/[businessUuid]/[shape]/route.ts";
  assert.ok(existsSync(path));
  const route = read(path);
  assert.match(route, /if \(!isPlatformLogoUrl\(source, baseUrl\)\) return NextResponse\.redirect\(source, \{ status: 302 \}\);/);
  assert.match(route, /PASS_LOGO_MAX_BYTES/);
  assert.match(route, /shape !== "wide" && shape !== "square"/);
});

test("Apple uses the wide copy, Google the square copy, and the card page matches the phone", () => {
  assert.match(read("src/lib/walletwallet/mapper.ts"), /shape: "wide"/);
  assert.match(read("src/lib/google-wallet/mapper.ts"), /shape: "square"/);
  assert.match(read("src/app/card/[token]/page.tsx"), /shape: passPlatform === "google" \? "square" : "wide"/);
  const card = read("src/components/wallet-pass/WalletPassCard.tsx");
  assert.match(card, /size="md" wide/);
  assert.doesNotMatch(card, /size="xs"/);
});
