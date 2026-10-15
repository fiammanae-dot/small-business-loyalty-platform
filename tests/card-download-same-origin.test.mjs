/**
 * The web card's "Download Front" turns the card into a PNG, which needs the
 * browser to read back every picture on it. The trimmed pass logo is built as
 * an absolute link on the configured app address; when the visitor is on a
 * different address (www versus apex) the browser refuses to read it and the
 * download fails. The card therefore keeps only the logo's path.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("pictures on the web card are always same-origin", async () => {
  const { sameOriginImage } = await loadTs("src/lib/same-origin-image.ts");
  assert.equal(
    sameOriginImage("https://loyaltycarduae.com/api/wallet/logo/16ad51fb-032a-4f8e-8979-d3abb2a6796c/wide.png?v=57e9b006b938"),
    "/api/wallet/logo/16ad51fb-032a-4f8e-8979-d3abb2a6796c/wide.png?v=57e9b006b938",
  );
  assert.equal(sameOriginImage("https://loyalty.test/api/wallet/logo/abc/square.png?v=1"), "/api/wallet/logo/abc/square.png?v=1");
  const photo = "https://pub-123.r2.dev/wallet-photos/a.jpg";
  assert.equal(sameOriginImage(photo), `/api/media?u=${encodeURIComponent(photo)}`);
  const logo = "https://pub-123.r2.dev/logos/a.png";
  assert.equal(sameOriginImage(logo), `/api/media?u=${encodeURIComponent(logo)}`);
  assert.equal(sameOriginImage("/uploads/logos/a.png"), "/uploads/logos/a.png");
  assert.equal(sameOriginImage("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
});

test("the pass logo goes through the same-origin helper", () => {
  const card = readFileSync("src/components/wallet-pass/WalletPassCard.tsx", "utf8");
  assert.match(card, /const logoUrl = url \? sameOriginImage\(url\) : null;/);
  assert.match(card, /<BusinessLogoAvatar logoUrl=\{logoUrl\}/);
});
