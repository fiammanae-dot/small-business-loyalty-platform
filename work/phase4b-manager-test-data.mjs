import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const env = readFileSync(join(process.cwd(), ".env"), "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (match) process.env.DATABASE_URL = match[1].trim().replace(/^"|"$/g, "");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const token = `cst_${randomBytes(18).toString("base64url")}`;
const phone = `+9715599${Date.now().toString().slice(-6)}`;

try {
  const manager = await pool.query(`
    select id, business_id, branch_id
    from users
    where role = 'BRANCH_MANAGER'
      and business_id is not null
      and branch_id is not null
    order by id
    limit 1
  `);
  if (!manager.rows[0]) throw new Error("No branch manager with branch assignment found.");

  const globalCustomer = await pool.query(
    `
      insert into global_customers (uuid, first_name, last_name, phone, normalized_phone, email, birthday, created_at, updated_at)
      values ($1, 'Phase4B', 'Branch Test', $2, $2, null, null, now(), now())
      returning id
    `,
    [randomUUID(), phone],
  );

  const membership = await pool.query(
    `
      insert into business_customer_memberships
        (uuid, global_customer_id, business_id, created_branch_id, created_by_user_id, marketing_consent, source, status, card_token, card_status, card_created_at, joined_at, created_at, updated_at)
      values ($1, $2, $3, $4, $5, true, 'STAFF', 'ACTIVE', $6, 'ACTIVE', now(), now(), now(), now())
      returning uuid, card_token
    `,
    [
      randomUUID(),
      globalCustomer.rows[0].id,
      manager.rows[0].business_id,
      manager.rows[0].branch_id,
      manager.rows[0].id,
      token,
    ],
  );

  console.log(JSON.stringify(membership.rows[0], null, 2));
} finally {
  await pool.end();
}
