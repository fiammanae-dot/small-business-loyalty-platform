#!/usr/bin/env node
/**
 * Clear tenant data from PRODUCTION, keeping the platform administrator.
 *
 * Production was only ever filled by QA seeds: one demo business, its staff,
 * and ~51 invented customers. Reports count raw rows with no status filter
 * (see health-analytics/page.tsx), so suspending or archiving those rows does
 * not take them out of the numbers - only removing them does.
 *
 * KEPT:     PLATFORM_OWNER users (and their 2FA backup codes),
 *           subscription_plans, platform_settings.
 * REMOVED:  every business and everything cascading from it, all global
 *           customers, every non-PLATFORM_OWNER user, and the audit/login
 *           noise left behind by testing.
 *
 * Two steps on purpose. The dry run performs the real deletes inside a
 * transaction and then rolls back, so the numbers it prints are measured, not
 * estimated:
 *
 *   node scripts/db/reset-production-data.mjs           measure, change nothing
 *   node scripts/db/reset-production-data.mjs --apply --yes-delete-production-data
 *
 * THIS CANNOT BE UNDONE. Take a Neon branch first - that is your only way back.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function fromEnvFile(key, file = ".env") {
  return readFileSync(file, "utf8").match(new RegExp(`^${key}="?([^"\\n\\r]+)"?$`, "m"))?.[1] ?? null;
}

const url = fromEnvFile("PRODUCTION_DATABASE_URL");
const devUrl = fromEnvFile("DATABASE_URL");
if (!url) {
  console.error("PRODUCTION_DATABASE_URL is not in .env. Stopping.");
  process.exit(1);
}
if (devUrl && new URL(devUrl).hostname === new URL(url).hostname) {
  console.error("DATABASE_URL and PRODUCTION_DATABASE_URL point at the same host. Fix .env first.");
  process.exit(1);
}

const apply = process.argv.includes("--apply") && process.argv.includes("--yes-delete-production-data");
const askedToApply = process.argv.includes("--apply");

// Order matters only for the two tables that do not cascade from businesses.
const STEPS = [
  ["audit_events", `DELETE FROM audit_events`],
  ["businesses (cascades to ~40 tables)", `DELETE FROM businesses`],
  ["global_customers", `DELETE FROM global_customers`],
  ["users (except PLATFORM_OWNER)", `DELETE FROM users WHERE role <> 'PLATFORM_OWNER'`],
  ["password_reset_tokens", `DELETE FROM password_reset_tokens`],
  ["failed_login_audit", `DELETE FROM failed_login_audit`],
  ["rate_limit_attempts", `DELETE FROM rate_limit_attempts`],
];

const SURVIVORS = ["users", "subscription_plans", "platform_settings", "two_factor_backup_codes"];

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  console.log(`\ntarget : ${new URL(url).hostname}  (PRODUCTION_DATABASE_URL)`);
  console.log(`mode   : ${apply ? "APPLY - this writes and cannot be undone" : "dry run - every change is rolled back"}\n`);

  const keep = await client.query(`SELECT id, name, email FROM users WHERE role = 'PLATFORM_OWNER' ORDER BY id`);
  if (keep.rowCount === 0) {
    console.error("No PLATFORM_OWNER user found. Refusing to run - this would leave you locked out.");
    process.exit(1);
  }
  console.log("These accounts are KEPT:");
  for (const row of keep.rows) console.log(`   #${row.id}  ${row.name}  <${row.email}>`);
  console.log();

  await client.query("BEGIN");

  console.log("Rows removed:");
  let total = 0;
  for (const [label, sql] of STEPS) {
    const { rowCount } = await client.query(sql);
    total += rowCount;
    console.log(`  ${String(rowCount).padStart(6)}  ${label}`);
  }
  console.log(`  ${String(total).padStart(6)}  TOTAL\n`);

  // Measured, not assumed: anything a cascade missed shows up here.
  const leftovers = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '_prisma%' ORDER BY table_name`);
  const remaining = [];
  for (const { table_name } of leftovers.rows) {
    const n = (await client.query(`SELECT COUNT(*)::int AS n FROM "${table_name}"`)).rows[0].n;
    if (n > 0) remaining.push([table_name, n]);
  }
  console.log("Rows still present afterwards:");
  for (const [t, n] of remaining) {
    const expected = SURVIVORS.includes(t) ? "kept on purpose" : "UNEXPECTED - tell Claude before applying";
    console.log(`  ${String(n).padStart(6)}  ${t.padEnd(32)} ${expected}`);
  }
  console.log();

  if (apply) {
    await client.query("COMMIT");
    console.log("Committed. Production now holds only your administrator and platform settings.\n");
  } else {
    await client.query("ROLLBACK");
    if (askedToApply) {
      console.log("--apply was given without the confirmation flag, so nothing was written.\n");
    }
    console.log("Nothing was written. Take a Neon backup branch, then run:\n");
    console.log("   node scripts/db/reset-production-data.mjs --apply --yes-delete-production-data\n");
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`\nFailed, nothing was written: ${error.message}`);
  console.error("A sleeping Neon compute usually answers on a second attempt - just run it again.\n");
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
