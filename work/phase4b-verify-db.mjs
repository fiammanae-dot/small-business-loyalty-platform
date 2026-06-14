import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const env = readFileSync(join(process.cwd(), ".env"), "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (match) process.env.DATABASE_URL = match[1].trim().replace(/^"|"$/g, "");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const columns = await pool.query(`
    select column_name, is_nullable, data_type, udt_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_customer_memberships'
      and column_name in ('card_token', 'card_status', 'card_created_at', 'card_last_viewed_at')
    order by column_name
  `);

  const summary = await pool.query(`
    select
      count(*)::int as total_memberships,
      count(card_token)::int as token_count,
      count(card_status)::int as status_count,
      count(card_created_at)::int as created_count,
      count(*) filter (where card_token is null)::int as missing_tokens,
      count(*) filter (where card_status is null)::int as missing_status,
      count(*) filter (where card_created_at is null)::int as missing_created_at,
      count(*) filter (where card_status = 'ACTIVE')::int as active_cards
    from business_customer_memberships
  `);

  const sample = await pool.query(`
    select
      m.uuid,
      m.card_token,
      m.card_status,
      b.name as business,
      gc.first_name,
      gc.last_name
    from business_customer_memberships m
    join businesses b on b.id = m.business_id
    join global_customers gc on gc.id = m.global_customer_id
    where m.card_token is not null
    order by m.created_at desc
    limit 1
  `);

  console.log(JSON.stringify({
    columns: columns.rows,
    summary: summary.rows[0],
    sample: sample.rows[0] ?? null,
  }, null, 2));
} finally {
  await pool.end();
}
