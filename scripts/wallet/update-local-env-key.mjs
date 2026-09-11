/**
 * Update GOOGLE_PRIVATE_KEY (and check the service account email) in the local
 * .env from a downloaded Google service-account JSON key file.
 *
 *   node scripts/wallet/update-local-env-key.mjs --json "C:\\Users\\you\\Downloads\\project-xxxx.json"
 *
 * Writes the key as a single escaped line, matching how .env already stores it.
 * Verifies the key actually parses as an RSA private key before writing.
 * Never prints the key. Dry run by default; pass --commit to write.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createPrivateKey } from "node:crypto";

const argv = process.argv.slice(2);
const jsonPath = argv[argv.indexOf("--json") + 1];
const COMMIT = argv.includes("--commit");

if (!jsonPath || jsonPath.startsWith("--")) {
  console.error('Usage: node scripts/wallet/update-local-env-key.mjs --json "<path to service account .json>" [--commit]');
  process.exit(1);
}

let service;
try { service = JSON.parse(readFileSync(jsonPath, "utf8")); }
catch (error) { console.error(`Could not read or parse ${jsonPath}:`, error.message); process.exit(1); }

const privateKey = service.private_key;
const clientEmail = service.client_email;
if (!privateKey) { console.error("That JSON has no private_key field - is it a service account key file?"); process.exit(1); }

// Does it actually parse as a key? Catches truncated or mangled pastes.
try {
  const parsed = createPrivateKey(privateKey);
  console.log("key parses            :", parsed.asymmetricKeyType, `${parsed.asymmetricKeyDetails?.modulusLength ?? "?"} bits`);
} catch (error) {
  console.error("This is NOT a valid private key:", error.message);
  process.exit(1);
}

console.log("service account       :", clientEmail);
console.log("key id                :", service.private_key_id ?? "(none)");

const envText = readFileSync(".env", "utf8");

const currentEmail = envText.match(/^GOOGLE_SERVICE_ACCOUNT_EMAIL="?([^"\n\r]+)"?$/m)?.[1];
if (currentEmail && clientEmail && currentEmail !== clientEmail) {
  console.error(`\nMISMATCH: .env has ${currentEmail} but this key belongs to ${clientEmail}.`);
  console.error("Aborting - you are probably holding the wrong project's key file.");
  process.exit(1);
}
console.log("email matches .env    :", currentEmail ? "yes" : "(no email in .env to compare)");

// .env stores the key on one line with escaped newlines.
const escaped = privateKey.replace(/\r?\n/g, "\\n");
const line = `GOOGLE_PRIVATE_KEY="${escaped}"`;

const pattern = /^GOOGLE_PRIVATE_KEY=.*$/m;
if (!pattern.test(envText)) {
  console.error("\nGOOGLE_PRIVATE_KEY not found in .env - not adding it blindly. Add the line manually once, then re-run.");
  process.exit(1);
}

const updated = envText.replace(pattern, line);
const changed = updated !== envText;
console.log("value differs from .env:", changed ? "yes (will update)" : "no (already this key)");

if (!COMMIT) {
  console.log("\nDRY RUN - .env not modified. Re-run with --commit to apply.");
  process.exit(0);
}

writeFileSync(".env", updated);

// Read back and prove the stored form decodes to the same key.
const stored = readFileSync(".env", "utf8").match(/^GOOGLE_PRIVATE_KEY="?([^\n\r]*?)"?$/m)?.[1] ?? "";
const roundTripped = stored.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
console.log("\nWRITTEN to .env");
console.log("stored value re-parses:", (() => { try { createPrivateKey(roundTripped); return "yes"; } catch { return "NO - check the file"; } })());
console.log("matches the JSON key  :", roundTripped.trim() === privateKey.trim());
console.log(`\nDone. Now delete ${jsonPath} and any other downloaded key files.`);
