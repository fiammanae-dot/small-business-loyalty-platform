#!/usr/bin/env node
/**
 * Run pending Prisma migrations against PRODUCTION.
 *
 * Local .env points DATABASE_URL at a Neon *development* branch, so a plain
 * `prisma migrate deploy` quietly migrates dev and leaves production behind -
 * which then breaks the moment Vercel deploys code expecting the new columns.
 * This targets PRODUCTION_DATABASE_URL explicitly, and takes the connection
 * string straight from .env so it is never retyped or pasted anywhere.
 *
 * Two steps on purpose:
 *   node scripts/db/migrate-production.mjs            shows what WOULD run
 *   node scripts/db/migrate-production.mjs --apply    actually applies it
 *
 * Add --direct if a run fails with P1001 on a "-pooler" host: `migrate deploy`
 * takes a session advisory lock, and a transaction-mode pooler cannot hold one.
 * --direct strips "-pooler" from the hostname to use Neon's direct endpoint.
 *
 * Additive migrations should be applied BEFORE merging the code that needs
 * them: new nullable columns are invisible to the running app, so production
 * keeps working, and the deploy then lands on a database that is already ready.
 * A migration that drops or renames anything is the reverse - deploy first.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function fromEnvFile(key, file = ".env") {
  const text = readFileSync(file, "utf8");
  return text.match(new RegExp(`^${key}="?([^"\\n\\r]+)"?$`, "m"))?.[1] ?? null;
}

const url = fromEnvFile("PRODUCTION_DATABASE_URL");
if (!url) {
  console.error("PRODUCTION_DATABASE_URL is not in .env.");
  console.error("Without it this script cannot tell production from the dev branch, so it stops.");
  process.exit(1);
}

const devUrl = fromEnvFile("DATABASE_URL");
const host = new URL(url).hostname;
const devHost = devUrl ? new URL(devUrl).hostname : null;

if (devHost && devHost === host) {
  console.error(`DATABASE_URL and PRODUCTION_DATABASE_URL both point at ${host}.`);
  console.error("That means local development is running against production - fix .env before migrating.");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const direct = process.argv.includes("--direct");

// Neon's direct endpoint is the same host without "-pooler".
const targetUrl = direct ? url.replace("-pooler.", ".") : url;
const targetHost = new URL(targetUrl).hostname;

if (direct && targetHost === host) {
  console.error("--direct was passed but the host has no \"-pooler\" in it, so there is nothing to strip.");
  process.exit(1);
}

console.log("");
console.log(`target      : ${targetHost}`);
console.log(`             (PRODUCTION_DATABASE_URL${direct ? ", direct endpoint" : ""})`);
if (devHost) console.log(`local dev   : ${devHost}  - not touched`);
console.log(`mode        : ${apply ? "APPLY - this writes to production" : "dry run - nothing will be written"}`);
console.log("");

const env = { ...process.env, DATABASE_URL: targetUrl, PRISMA_HIDE_UPDATE_MESSAGE: "1" };
const args = apply ? ["prisma", "migrate", "deploy"] : ["prisma", "migrate", "status"];

const result = spawnSync("npx", args, { env, stdio: "inherit", shell: process.platform === "win32" });

if (!apply) {
  console.log("");
  console.log("Nothing was written. To apply the migrations listed above, run:");
  console.log("   node scripts/db/migrate-production.mjs --apply");
}

// P1001 means the connection never opened, so nothing was written and a retry
// is always safe. On Neon that is usually a suspended compute; if a retry does
// not fix it, the pooled endpoint cannot hold the advisory lock deploy needs.
if (result.status !== 0 && !direct && targetHost.includes("-pooler.")) {
  console.log("");
  console.log("If that failed with P1001, nothing was written. Retry once - a suspended");
  console.log("Neon compute usually answers on the second attempt. If it fails again:");
  console.log(`   node scripts/db/migrate-production.mjs ${apply ? "--apply " : ""}--direct`);
}

process.exit(result.status ?? 1);
