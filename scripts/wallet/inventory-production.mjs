/** Read-only inventory of PRODUCTION, so we know exactly what a cleanup would remove. */
import pg from "pg";
import { readFileSync } from "node:fs";
const env = readFileSync(".env", "utf8");
const url = env.match(/^PRODUCTION_DATABASE_URL="?([^"\n\r]+)"?$/m)?.[1]
         ?? env.match(/^DATABASE_URL="?([^"\n\r]+)"?$/m)?.[1];
const c = new pg.Client({ connectionString: url });
await c.connect();
console.log("database:", new URL(url).hostname);
console.log();

const businesses = (await c.query(`
  select b.id, b.name, b.status, b.created_at,
    (select count(*) from loyalty_programs p where p.business_id = b.id)::int as programs,
    (select count(*) from business_customer_memberships m where m.business_id = b.id)::int as customers,
    (select count(*) from stamp_transactions s
       join customer_program_memberships cpm on cpm.id = s.customer_program_membership_id
       join business_customer_memberships bcm on bcm.id = cpm.business_customer_membership_id
       where bcm.business_id = b.id)::int as stamps,
    (select count(*) from reward_redemptions r where r.business_id = b.id)::int as redemptions,
    (select count(*) from users u where u.business_id = b.id)::int as users,
    (select count(*) from business_whatsapp_channels w where w.business_id = b.id)::int as wa_channel
  from businesses b order by b.id`)).rows;

console.log(`businesses: ${businesses.length}`);
for (const b of businesses) {
  console.log(` [${b.id}] ${b.name}  (${b.status}, created ${b.created_at.toISOString().slice(0,10)})`);
  console.log(`      programs ${b.programs} | customers ${b.customers} | stamps ${b.stamps} | redemptions ${b.redemptions} | users ${b.users} | whatsapp ${b.wa_channel ? "CONNECTED" : "-"}`);
}

for (const [label, sql] of [
  ["global_customers (shared identity)", "select count(*)::int n from global_customers"],
  ["users total",                        "select count(*)::int n from users"],
  ["audit_events (do NOT cascade)",      "select count(*)::int n from audit_events"],
  ["message_delivery_queue",             "select count(*)::int n from message_delivery_queue"],
]) {
  const n = (await c.query(sql)).rows[0].n;
  console.log(`${label.padEnd(38)}: ${n}`);
}
await c.end();
