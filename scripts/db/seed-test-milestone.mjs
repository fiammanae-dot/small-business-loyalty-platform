#!/usr/bin/env node
/**
 * Give a program a mid-card milestone, so Stage 1 can be exercised for real
 * before the editor exists.
 *
 * DEVELOPMENT ONLY. Refuses to run against PRODUCTION_DATABASE_URL, and
 * refuses if any customer on the program is already mid-card with a claimed
 * reward - adding a milestone underneath a live card is exactly the people
 * problem the staged rollout exists to avoid.
 *
 *   node scripts/db/seed-test-milestone.mjs --program 1 --at 5 --name "50% off"
 *   node scripts/db/seed-test-milestone.mjs --program 1 --at 5 --name "50% off" --commit
 *   node scripts/db/seed-test-milestone.mjs --program 1 --remove --commit
 */
import pg from "pg";
import { readFileSync } from "node:fs";

function fromEnvFile(key, file = ".env") {
  return readFileSync(file, "utf8").match(new RegExp(`^${key}="?([^"\\n\\r]+)"?$`, "m"))?.[1] ?? null;
}

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || !argv[i + 1] || argv[i + 1].startsWith("--") ? fallback : argv[i + 1];
};
const COMMIT = argv.includes("--commit");
const REMOVE = argv.includes("--remove");
const programId = Number(arg("program", "1"));
const atStamp = Number(arg("at", "5"));
const rewardName = arg("name", "50% off");
const rewardDescription = arg("description", rewardName);

const devUrl = fromEnvFile("DATABASE_URL");
const prodUrl = fromEnvFile("PRODUCTION_DATABASE_URL");
if (!devUrl) { console.error("DATABASE_URL not found in .env"); process.exit(1); }
if (prodUrl && new URL(devUrl).hostname === new URL(prodUrl).hostname) {
  console.error("DATABASE_URL points at production. This script is development-only. Aborting.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: devUrl });
await client.connect();
console.log(`database : ${new URL(devUrl).hostname} (development)`);
console.log(`mode     : ${COMMIT ? "COMMIT" : "dry run - nothing will be written"}\n`);

const { rows: [program] } = await client.query(
  `select id, name, required_stamps, reward_name from loyalty_programs where id = $1`, [programId]);
if (!program) { console.error(`No loyalty program with id ${programId}.`); await client.end(); process.exit(1); }
console.log(`program  : [${program.id}] ${program.name} - ${program.required_stamps} stamps, "${program.reward_name}"`);

// Adding a milestone under a card that already has claims would change what a
// customer is owed halfway through. Refuse rather than reason about it.
const { rows: [live] } = await client.query(
  `select count(*)::int n from customer_program_memberships
   where loyalty_program_id = $1 and array_length(claimed_reward_stamps, 1) > 0`, [programId]);
if (live.n > 0 && !REMOVE) {
  console.error(`\n${live.n} membership(s) on this program already have a claimed reward. Aborting.`);
  await client.end();
  process.exit(1);
}

const { rows: existing } = await client.query(
  `select at_stamp, reward_name, completes_card from program_rewards
   where loyalty_program_id = $1 order by at_stamp`, [programId]);
console.log("\ncurrent card:");
for (const r of existing) {
  console.log(`  visit ${String(r.at_stamp).padStart(2)}  ${r.reward_name}${r.completes_card ? "   <- completes the card" : ""}`);
}

if (REMOVE) {
  console.log(`\nwould remove every non-completing reward from this program.`);
  if (COMMIT) {
    const { rowCount } = await client.query(
      `delete from program_rewards where loyalty_program_id = $1 and completes_card = false`, [programId]);
    await client.query(
      `update customer_program_memberships set claimed_reward_stamps = '{}'
       where loyalty_program_id = $1`, [programId]);
    console.log(`removed ${rowCount} milestone(s) and cleared claimed sets.`);
  }
  await client.end();
  process.exit(0);
}

if (!Number.isInteger(atStamp) || atStamp < 1 || atStamp >= program.required_stamps) {
  console.error(`\n--at must be between 1 and ${program.required_stamps - 1} (before the card completes). Got ${atStamp}.`);
  await client.end();
  process.exit(1);
}
if (existing.some((r) => r.at_stamp === atStamp)) {
  console.error(`\nThis program already has a reward at visit ${atStamp}.`);
  await client.end();
  process.exit(1);
}

console.log(`\nwould add: visit ${atStamp}  ${rewardName}   (does NOT complete the card)`);

if (!COMMIT) {
  console.log("\nDRY RUN - nothing written. Re-run with --commit to apply.");
  await client.end();
  process.exit(0);
}

await client.query(
  `insert into program_rewards
     (loyalty_program_id, at_stamp, reward_name, reward_description, completes_card, updated_at)
   values ($1, $2, $3, $4, false, current_timestamp)`,
  [programId, atStamp, rewardName, rewardDescription]);

const { rows: after } = await client.query(
  `select at_stamp, reward_name, completes_card from program_rewards
   where loyalty_program_id = $1 order by at_stamp`, [programId]);
console.log("\ncard is now:");
for (const r of after) {
  console.log(`  visit ${String(r.at_stamp).padStart(2)}  ${r.reward_name}${r.completes_card ? "   <- completes the card" : ""}`);
}
await client.end();
