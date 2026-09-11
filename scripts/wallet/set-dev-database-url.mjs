/**
 * Point local development at the Neon dev branch, without the connection string
 * passing through a chat, a screen, or a file.
 *
 * Reads the connection string from the Windows clipboard (copy it from Neon's
 * "Copy snippet"), then rewrites .env so:
 *
 *   PRODUCTION_DATABASE_URL = whatever DATABASE_URL is today (production)
 *   DATABASE_URL            = the dev branch from the clipboard
 *
 * The operational scripts in scripts/whatsapp/ prefer PRODUCTION_DATABASE_URL,
 * so client onboarding keeps targeting production while the app runs on dev.
 *
 *   node scripts/wallet/set-dev-database-url.mjs            (dry run)
 *   node scripts/wallet/set-dev-database-url.mjs --commit
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const COMMIT = process.argv.includes("--commit");

const read = process.platform === "win32"
  ? spawnSync("powershell.exe", ["-NoProfile", "-Command", "Get-Clipboard -Raw"], { encoding: "utf8" })
  : spawnSync("xclip", ["-selection", "clipboard", "-o"], { encoding: "utf8" });

const candidate = (read.stdout ?? "").trim();
if (!candidate) { console.error("Clipboard is empty. Copy the dev branch connection string from Neon first."); process.exit(1); }

let parsed;
try { parsed = new URL(candidate); } catch { console.error("Clipboard does not contain a URL."); process.exit(1); }
if (!/^postgres(ql)?:$/.test(parsed.protocol)) { console.error(`Clipboard is not a postgres URL (got ${parsed.protocol}).`); process.exit(1); }
if (!parsed.password) { console.error("That connection string has no password - use Neon's 'Copy snippet', not the masked display."); process.exit(1); }

console.log("clipboard holds       : postgres URL");
console.log("   host               :", parsed.hostname);
console.log("   database           :", parsed.pathname.replace(/^\//, ""));
console.log("   password present   : yes");

const envText = readFileSync(".env", "utf8");
const currentUrl = envText.match(/^DATABASE_URL="?([^"\n\r]+)"?$/m)?.[1];
if (!currentUrl) { console.error("DATABASE_URL not found in .env"); process.exit(1); }
const currentHost = new URL(currentUrl).hostname;
console.log("\ncurrent DATABASE_URL  :", currentHost, "(this will become PRODUCTION_DATABASE_URL)");

if (currentHost === parsed.hostname) {
  console.error("\nThose are the same host - the clipboard looks like production, not the dev branch. Aborting.");
  process.exit(1);
}

const alreadyHasProd = /^PRODUCTION_DATABASE_URL=/m.test(envText);
console.log("PRODUCTION_DATABASE_URL already in .env:", alreadyHasProd ? "yes (will be left as is)" : "no (will be added)");

if (!COMMIT) {
  console.log("\nDRY RUN - .env not modified. Re-run with --commit to apply.");
  process.exit(0);
}

let updated = envText;
if (!alreadyHasProd) {
  updated = updated.replace(/^DATABASE_URL=.*$/m,
    `# Production. Used by scripts/whatsapp/* for real client onboarding.\r\nPRODUCTION_DATABASE_URL="${currentUrl}"\r\n\r\n# Local development - Neon "dev" branch.\r\nDATABASE_URL="${candidate}"`);
} else {
  updated = updated.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${candidate}"`);
}
writeFileSync(".env", updated);

const after = readFileSync(".env", "utf8");
const nowDev = after.match(/^DATABASE_URL="?([^"\n\r]+)"?$/m)?.[1];
const nowProd = after.match(/^PRODUCTION_DATABASE_URL="?([^"\n\r]+)"?$/m)?.[1];
console.log("\nWRITTEN to .env");
console.log("   DATABASE_URL            ->", nowDev ? new URL(nowDev).hostname : "MISSING");
console.log("   PRODUCTION_DATABASE_URL ->", nowProd ? new URL(nowProd).hostname : "MISSING");
console.log("\nNext: npx prisma migrate deploy   (apply the schema to the dev branch)");
