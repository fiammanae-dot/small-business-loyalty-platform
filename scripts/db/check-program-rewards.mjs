#!/usr/bin/env node
/**
 * Read-only: did migration 0048's backfill actually reproduce today's behaviour?
 *
 * "All migrations have been successfully applied" only means the SQL ran. The
 * load-bearing claim is narrower: every program must end up with exactly one
 * card-completing reward, sitting at the stamp count it already completes on.
 * If that is not true for even one program, the engine rewrite that follows
 * will change what a customer sees.
 *
 *   node scripts/db/check-program-rewards.mjs              (dev, from DATABASE_URL)
 *   node scripts/db/check-program-rewards.mjs --production (PRODUCTION_DATABASE_URL)
 */
import pg from "pg";
import { readFileSync } from "node:fs";

function fromEnvFile(key, file = ".env") {
  return readFileSync(file, "utf8").match(new RegExp(`^${key}="?([^"\\n\\r]+)"?$`, "m"))?.[1] ?? null;
}

const useProduction = process.argv.includes("--production");
const url = useProduction ? fromEnvFile("PRODUCTION_DATABASE_URL") : fromEnvFile("DATABASE_URL");
if (!url) {
  console.error(`${useProduction ? "PRODUCTION_DATABASE_URL" : "DATABASE_URL"} not found in .env`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
console.log(`database : ${new URL(url).hostname}`);
console.log(`           (${useProduction ? "PRODUCTION" : "development"})\n`);

let failures = 0;
const fail = (message) => { console.log(`  FAIL  ${message}`); failures += 1; };
const pass = (message) => console.log(`  ok    ${message}`);

const { rows: [counts] } = await client.query(`
  select (select count(*)::int from loyalty_programs) as programs,
         (select count(*)::int from program_rewards)  as rewards`);
console.log(`programs: ${counts.programs}   program_rewards: ${counts.rewards}\n`);

// 1. Every program has exactly one completing reward.
const { rows: badCompleting } = await client.query(`
  select p.id, p.name, count(r.id) filter (where r.completes_card)::int as completing
  from loyalty_programs p
  left join program_rewards r on r.loyalty_program_id = p.id
  group by p.id, p.name
  having count(r.id) filter (where r.completes_card) <> 1
  order by p.id`);
if (badCompleting.length === 0) pass("every program has exactly one completes_card reward");
else for (const r of badCompleting) fail(`[${r.id}] ${r.name} has ${r.completing} completing rewards, expected 1`);

// 2. That reward sits where the card actually completes.
const { rows: misplaced } = await client.query(`
  select p.id, p.name, p.required_stamps, r.at_stamp
  from loyalty_programs p
  join program_rewards r on r.loyalty_program_id = p.id and r.completes_card
  where r.at_stamp <> greatest(p.required_stamps, 1)
  order by p.id`);
if (misplaced.length === 0) pass("each completing reward sits at the program's required_stamps");
else for (const r of misplaced) fail(`[${r.id}] ${r.name}: completes at ${r.at_stamp}, card requires ${r.required_stamps}`);

// 3. Name and description carried over, so nothing a customer reads changed.
const { rows: drifted } = await client.query(`
  select p.id, p.name
  from loyalty_programs p
  join program_rewards r on r.loyalty_program_id = p.id and r.completes_card
  where r.reward_name <> p.reward_name or r.reward_description <> p.reward_description
  order by p.id`);
if (drifted.length === 0) pass("reward name and description match the program exactly");
else for (const r of drifted) fail(`[${r.id}] ${r.name}: reward text differs from the program`);

// 4. Nobody is mid-card with something already claimed.
const { rows: [claimed] } = await client.query(`
  select count(*)::int n from customer_program_memberships
  where array_length(claimed_reward_stamps, 1) > 0`);
if (claimed.n === 0) pass("no membership has a claimed reward yet (expected before the engine ships)");
else fail(`${claimed.n} membership(s) already have claimed_reward_stamps set`);

// 5. Historical redemptions: linked where they could be, null where they could not.
const { rows: [links] } = await client.query(`
  select count(*)::int total,
         count(program_reward_id)::int linked
  from reward_redemptions`);
console.log(`\nredemptions: ${links.linked}/${links.total} linked to a reward` +
  (links.total > links.linked ? `  (${links.total - links.linked} left null - required_stamps did not match)` : ""));

await client.end();
console.log(failures === 0 ? "\nBackfill verified: today's behaviour is reproduced exactly." : `\n${failures} problem(s) found.`);
process.exit(failures === 0 ? 0 : 1);
