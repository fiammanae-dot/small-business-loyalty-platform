import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const env = readFileSync(join(process.cwd(), ".env"), "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (match) process.env.DATABASE_URL = match[1].trim().replace(/^"|"$/g, "");

const temporaryPassword = process.env.TEST_ACCOUNT_TEMPORARY_PASSWORD?.trim();
if (!temporaryPassword) {
  throw new Error("TEST_ACCOUNT_TEMPORARY_PASSWORD must be set before resetting test account passwords.");
}
const passwordHash = await bcrypt.hash(temporaryPassword, 12);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(
    `
      update users
      set password_hash = $1, updated_at = now()
      where role in ('BUSINESS_OWNER', 'BRANCH_MANAGER', 'STAFF')
      returning email
    `,
    [passwordHash],
  );

  console.log(JSON.stringify({ temporaryPassword, updatedAccounts: result.rows.length }, null, 2));
} finally {
  await pool.end();
}
