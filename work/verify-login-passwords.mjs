import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const env = readFileSync(join(process.cwd(), ".env"), "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (match) process.env.DATABASE_URL = match[1].trim().replace(/^"|"$/g, "");

const knownPasswords = new Map([
  ["PLATFORM_OWNER", "<set-secure-password-in-environment>"],
  ["BUSINESS_OWNER", process.env.TEST_BUSINESS_OWNER_PASSWORD],
  ["BRANCH_MANAGER", process.env.TEST_BRANCH_MANAGER_PASSWORD],
  ["STAFF", process.env.TEST_STAFF_PASSWORD],
]);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(`
    select email, role, password_hash
    from users
    order by id
  `);

  const checks = [];
  for (const user of result.rows) {
    const password = knownPasswords.get(user.role);
    checks.push({
      email: user.email,
      role: user.role,
      password,
      passwordVerified: password ? await bcrypt.compare(password, user.password_hash) : false,
    });
  }

  console.log(JSON.stringify(checks, null, 2));
} finally {
  await pool.end();
}
