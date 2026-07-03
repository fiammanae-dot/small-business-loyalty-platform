import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const env = readFileSync(join(process.cwd(), ".env"), "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (match) process.env.DATABASE_URL = match[1].trim().replace(/^"|"$/g, "");

function normalizePhone(phone) {
  let normalized = phone.trim().replace(/[\s\-()]/g, "");
  if (normalized.startsWith("05")) normalized = `+971${normalized.slice(1)}`;
  else if (normalized.startsWith("971")) normalized = `+${normalized}`;
  else if (!normalized.startsWith("+") && normalized.length > 0) normalized = `+${normalized}`;
  return normalized;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const suffix = Date.now();

  try {
    const tableRows = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('global_customers', 'business_customer_memberships')
      order by table_name
    `);

    await client.query("begin");

    const plan = await client.query("select id from subscription_plans where name = 'Starter' limit 1");
    if (!plan.rows[0]) throw new Error("Starter plan is missing");

    const businessA = await client.query(
      `insert into businesses (uuid, name, business_type, status, created_at, updated_at)
       values ($1, $2, 'COFFEE_SHOP', 'ACTIVE', now(), now())
       returning id, uuid`,
      [randomUUID(), `Phase4A Coffee ${suffix}`],
    );
    const businessB = await client.query(
      `insert into businesses (uuid, name, business_type, status, created_at, updated_at)
       values ($1, $2, 'BARBERSHOP', 'ACTIVE', now(), now())
       returning id, uuid`,
      [randomUUID(), `Phase4A Barber ${suffix}`],
    );

    const branchA = await client.query(
      `insert into branches (uuid, business_id, name, country, city, address, status, created_at, updated_at)
       values ($1, $2, 'Main', 'UAE', 'Dubai', 'Phase 4A Street', 'ACTIVE', now(), now())
       returning id`,
      [randomUUID(), businessA.rows[0].id],
    );
    const branchB = await client.query(
      `insert into branches (uuid, business_id, name, country, city, address, status, created_at, updated_at)
       values ($1, $2, 'Main', 'UAE', 'Dubai', 'Phase 4A Street', 'ACTIVE', now(), now())
       returning id`,
      [randomUUID(), businessB.rows[0].id],
    );

    const normalizedPhone = normalizePhone("050 123-4567");
    const customer = await client.query(
      `insert into global_customers (uuid, first_name, last_name, phone, normalized_phone, email, birthday, created_at, updated_at)
       values ($1, 'Ahmed', 'Phase4A', '050 123-4567', $2, $3, null, now(), now())
       on conflict (normalized_phone) do update set updated_at = now()
       returning id, uuid, normalized_phone`,
      [randomUUID(), normalizedPhone, `phase4a.customer.${suffix}@loyaltycarduae.example`],
    );

    const membershipA = await client.query(
      `insert into business_customer_memberships
        (uuid, global_customer_id, business_id, created_branch_id, marketing_consent, source, status, notes, joined_at, created_at, updated_at)
       values ($1, $2, $3, $4, true, 'OWNER', 'ACTIVE', 'Business A membership', now(), now(), now())
       returning id, uuid`,
      [randomUUID(), customer.rows[0].id, businessA.rows[0].id, branchA.rows[0].id],
    );
    const membershipB = await client.query(
      `insert into business_customer_memberships
        (uuid, global_customer_id, business_id, created_branch_id, marketing_consent, source, status, notes, joined_at, created_at, updated_at)
       values ($1, $2, $3, $4, false, 'STAFF', 'ACTIVE', 'Business B membership', now(), now(), now())
       returning id, uuid`,
      [randomUUID(), customer.rows[0].id, businessB.rows[0].id, branchB.rows[0].id],
    );

    let duplicateBlocked = false;
    try {
      await client.query("savepoint duplicate_check");
      await client.query(
        `insert into business_customer_memberships
          (uuid, global_customer_id, business_id, created_branch_id, marketing_consent, source, status, joined_at, created_at, updated_at)
         values ($1, $2, $3, $4, false, 'OWNER', 'ACTIVE', now(), now(), now())`,
        [randomUUID(), customer.rows[0].id, businessA.rows[0].id, branchA.rows[0].id],
      );
    } catch (error) {
      duplicateBlocked = error.code === "23505";
      await client.query("rollback to savepoint duplicate_check");
    }

    const isolation = await client.query(
      `select
        count(*) filter (where business_id = $1) as business_a_memberships,
        count(*) filter (where business_id = $2) as business_b_memberships,
        count(distinct global_customer_id) as global_customer_count
       from business_customer_memberships
       where global_customer_id = $3`,
      [businessA.rows[0].id, businessB.rows[0].id, customer.rows[0].id],
    );

    await client.query("rollback");

    console.log(JSON.stringify({
      tables: tableRows.rows.map((row) => row.table_name),
      normalizedPhone,
      businessAMembershipUuid: membershipA.rows[0].uuid,
      businessBMembershipUuid: membershipB.rows[0].uuid,
      duplicateBlocked,
      isolation: isolation.rows[0],
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
