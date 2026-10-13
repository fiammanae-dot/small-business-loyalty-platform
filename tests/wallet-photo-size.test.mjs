/**
 * The card picture becomes the banner across the top of the wallet pass, and
 * the pass provider refuses banners over 1MB ("stripURL image exceeds the 1MB
 * limit"). Every uploaded picture is therefore resized to the banner's size
 * and saved as a JPEG before it is stored.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("wallet pictures are resized and compressed before they are stored", () => {
  const storage = readFileSync("src/lib/logo-storage.ts", "utf8");
  assert.match(storage, /export const WALLET_PHOTO_MAX_WIDTH = 1125;/);
  assert.match(storage, /export const WALLET_PHOTO_PROVIDER_LIMIT_BYTES = 1024 \* 1024;/);
  assert.match(storage, /export async function normaliseWalletPhoto\(buffer: Buffer\)/);
  assert.match(storage, /\.rotate\(\)/);
  assert.match(storage, /fit: "inside", withoutEnlargement: true/);
  assert.match(storage, /while \(out\.length > WALLET_PHOTO_PROVIDER_LIMIT_BYTES \* 0\.8 && quality > 50\)/);
  assert.match(storage, /return saveImageFile\(await normaliseWalletPhoto\(buffer\), "jpg", "wallet-photos"\);/);
});
