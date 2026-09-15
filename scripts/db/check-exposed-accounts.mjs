#!/usr/bin/env node
/**
 * Read-only audit of what the committed secrets can actually reach.
 *
 * Three files with live credentials sat in a PUBLIC repo, and they are still
 * readable in the git history. Rotating everything blindly is disruptive -
 * rotating the 2FA key locks every enrolled admin out - so this reports what
 * production actually has before anything is changed.
 *
 * Talks to Postgres directly with `pg` rather than Prisma, so it runs anywhere
 * without the schema engine binary. Reads PRODUCTION_DATABASE_URL from .env and
 * prints counts only - never a secret, a hash, or a password.
 *
 *   node scripts/db/check-exposed-accounts.mjs
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function fromEnvFile(key, file = ".env") {
  return readFileSync(file, "utf8").match(new RegExp(`^${key}="?([^"\\n\\r]+)"?$`, "m"))?.[1] ?? null;
}

const url = fromEnvFile("PRODUCTION_DATABASE_URL");
if (!url) {
  console.error("PRODUCTION_DATABASE_URL is not in .env - cannot tell production from the dev branch.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
const host = new URL(url).hostname;

const QUERIES = [
  {
    label: "admins with 2FA enrolled",
    sql: `SELECT COUNT(*)::int AS n FROM users WHERE two_factor_enabled = true`,
    explain: (n) =>
      n === 0
        ? "Nobody is enrolled, so rotating TWO_FACTOR_ENCRYPTION_KEY breaks nothing. Rotate it now."
        : `${n} user(s) would be locked out by rotating TWO_FACTOR_ENCRYPTION_KEY and must re-enroll.\n` +
          "    Their backup codes still work - those are SHA-256 of the code, not tied to the key.",
  },
  {
    label: "QA/test accounts (.test email) in PRODUCTION",
    sql: `SELECT COUNT(*)::int AS n FROM users WHERE email LIKE '%.test'`,
    explain: (n) =>
      n === 0
        ? "The QA logins never reached production. Nothing to do beyond the dev database."
        : `${n} account(s) in production use the shared QA password that is public in the git history.\n` +
          "    Delete them, or change the password on each.",
  },
  {
    label: "roles held by those .test accounts",
    sql: `SELECT role, COUNT(*)::int AS n FROM users WHERE email LIKE '%.test' GROUP BY role ORDER BY n DESC`,
    rows: true,
    explain: (rows) => {
      const privileged = rows.filter((r) => /ADMIN|OWNER/i.test(r.role));
      return privileged.length
        ? "PRIVILEGED. Anyone reading the public repo can sign in to production with these.\n" +
          "    Do this before the Wallet key - it is a live way in, not a theoretical one."
        : "None are admin or owner, which limits the blast radius - but they are still live logins.";
    },
  },
  {
    label: "total users in production",
    sql: `SELECT COUNT(*)::int AS n FROM users`,
    explain: () => "For scale - how many people a SESSION_SECRET rotation would sign out.",
  },
];

try {
  await client.connect();
  console.log(`\ntarget : ${host}  (PRODUCTION_DATABASE_URL)`);
  console.log("mode   : read-only - counts only, no values\n");

  for (const query of QUERIES) {
    const { label, sql, explain } = query;
    try {
      const result = await client.query(sql);
      if (query.rows) {
        console.log(`         ${label}`);
        for (const row of result.rows) console.log(`  ${String(row.n).padStart(5)}  ${row.role}`);
        console.log(`         ${explain(result.rows)}\n`);
        continue;
      }
      const n = result.rows[0].n;
      console.log(`  ${String(n).padStart(5)}  ${label}`);
      console.log(`         ${explain(n)}\n`);
    } catch (error) {
      console.log(`      ?  ${label}`);
      console.log(`         could not read: ${error.message}\n`);
    }
  }
} catch (error) {
  console.error(`\nCould not connect: ${error.message}`);
  console.error("A suspended Neon compute usually answers on a second attempt - just run it again.\n");
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
