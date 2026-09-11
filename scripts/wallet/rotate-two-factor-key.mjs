/**
 * Rotate TWO_FACTOR_ENCRYPTION_KEY in the local .env.
 *
 * REFUSES to run while any user still has 2FA enabled, because a rotation
 * orphans their encrypted secret and the app cannot tell "wrong key" from
 * "wrong code" - they would be locked out with no self-service recovery.
 * Disable 2FA for every enrolled user first.
 *
 *   node scripts/wallet/rotate-two-factor-key.mjs            (check only)
 *   node scripts/wallet/rotate-two-factor-key.mjs --commit   (generate + write)
 *
 * Never prints the key. Read it from .env when you set it in Vercel.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import pg from "pg";

const COMMIT = process.argv.includes("--commit");
const envText = readFileSync(".env", "utf8");
const url = envText.match(/^DATABASE_URL="?([^"\n\r]+)"?$/m)?.[1];
if (!url) { console.error("DATABASE_URL not found in .env"); process.exit(1); }

const c = new pg.Client({ connectionString: url });
await c.connect();
const enrolled = (await c.query(
  `select id, email, role from users where two_factor_enabled = true order by id`)).rows;
await c.end();

if (enrolled.length) {
  console.error(`REFUSING TO ROTATE - ${enrolled.length} user(s) still have 2FA enabled:`);
  for (const u of enrolled) {
    console.error(`   id ${u.id} | ${u.role} | ${u.email.replace(/^(.).*(@.*)$/, "$1***$2")}`);
  }
  console.error("\nDisable two-factor for each of them first (/account/two-factor),");
  console.error("then re-run. Rotating now would lock them out permanently.");
  process.exit(1);
}
console.log("enrolled users        : 0 (safe to rotate)");

if (!/^TWO_FACTOR_ENCRYPTION_KEY=/m.test(envText)) {
  console.error("TWO_FACTOR_ENCRYPTION_KEY not found in .env - aborting rather than adding blindly.");
  process.exit(1);
}

if (!COMMIT) {
  console.log("\nCHECK ONLY - nothing generated or written.");
  console.log("Re-run with --commit to generate a new key and write it to .env.");
  process.exit(0);
}

const key = randomBytes(32).toString("base64");
const updated = envText.replace(/^TWO_FACTOR_ENCRYPTION_KEY=.*$/m, `TWO_FACTOR_ENCRYPTION_KEY="${key}"`);
writeFileSync(".env", updated);

const stored = readFileSync(".env", "utf8").match(/^TWO_FACTOR_ENCRYPTION_KEY="?([^"\n\r]+)"?$/m)?.[1] ?? "";
console.log("\nWRITTEN to .env");
console.log("base64 length         :", stored.length);
console.log("decodes to bytes      :", Buffer.from(stored, "base64").length);
console.log("matches generated key :", stored === key);
console.log("\nNow open .env, copy the TWO_FACTOR_ENCRYPTION_KEY value, and set it in Vercel");
console.log("(Production and Preview, matching how it is set today). Then redeploy.");
