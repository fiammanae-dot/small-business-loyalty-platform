/**
 * Read-only: inspect recent WhatsApp welcome-card deliveries for one business.
 * Prints masked recipients only, and checks the WELCOME_CUSTOMER idempotency guard.
 *
 *   node scripts/whatsapp/check-delivery.mjs --business "Emirates Coffee House" [--limit 10]
 */
import pg from "pg";
import { parseArgs, require_, fromEnvFile } from "./_args.mjs";

const USAGE = `Usage:\n  node scripts/whatsapp/check-delivery.mjs --business "<name>" [--limit 10]`;
const args = parseArgs();
const businessName = require_(args, "business", USAGE);
const limit = Number(args.limit ?? 10);

const DATABASE_URL = fromEnvFile("DATABASE_URL");
if (!DATABASE_URL) { console.error("DATABASE_URL not found in .env"); process.exit(1); }

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const business = (await client.query(`select id from businesses where name = $1`, [businessName])).rows[0];
if (!business) { console.error(`Business "${businessName}" not found.`); await client.end(); process.exit(1); }

const channel = (await client.query(
  `select connection_status, welcome_template_name, welcome_template_status, last_error_message, last_checked_at
   from business_whatsapp_channels where business_id = $1`, [business.id])).rows[0];
console.log("channel:", channel ? JSON.stringify(channel, null, 2) : "no row");

const rows = (await client.query(
  `select q.id, q.status, q.channel, q.recipient_masked, q.provider_message_id, q.error_message,
          q.sent_at, q.created_at, q.business_customer_membership_id, q.message_body, e.event_type
   from message_delivery_queue q
   left join engagement_events e on e.id = q.engagement_event_id
   where q.business_id = $1
   order by q.created_at desc limit $2`, [business.id, limit])).rows;

console.log(`\n${rows.length} most recent delivery rows:\n`);
for (const row of rows) {
  console.log(`#${row.id}  ${row.status.padEnd(14)} ${row.channel.padEnd(10)} ${row.recipient_masked}`);
  console.log(`     event        : ${row.event_type ?? "(none)"}`);
  console.log(`     membership   : ${row.business_customer_membership_id}`);
  console.log(`     providerMsgId: ${row.provider_message_id ?? "(none)"}`);
  if (row.error_message) console.log(`     ERROR        : ${row.error_message}`);
  console.log(`     created      : ${row.created_at.toISOString()}   sent: ${row.sent_at ? row.sent_at.toISOString() : "(not sent)"}`);
  console.log(`     body         : ${row.message_body.replace(/\s+/g, " ").slice(0, 200)}`);
  console.log();
}

const duplicates = (await client.query(
  `select q.business_customer_membership_id as membership, count(*)::int as n
   from message_delivery_queue q
   join engagement_events e on e.id = q.engagement_event_id
   where q.business_id = $1 and e.event_type = 'WELCOME_CUSTOMER'
   group by 1 having count(*) > 1`, [business.id])).rows;
console.log("duplicate WELCOME_CUSTOMER deliveries:",
  duplicates.length ? JSON.stringify(duplicates) : "none (idempotency holding)");

await client.end();
