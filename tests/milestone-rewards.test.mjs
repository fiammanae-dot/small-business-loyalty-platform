import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

// rewards.ts imports progressValue from @/lib/programs, which an in-memory
// module cannot resolve. progressValue is `earned + bonus` and nothing more, so
// the import is rewritten to a local definition rather than stubbing behaviour.
async function importRewards() {
  const source = read("src/lib/rewards.ts").replace(
    'import { progressValue } from "@/lib/programs";',
    "const progressValue = (earned, bonus) => earned + bonus;",
  );
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
}

const rewards = await importRewards();

// Al Bab Al Abyad's card: 50% off at visit 5, free wash at visit 9.
const CARD = [
  { atStamp: 5, rewardName: "50% off car wash", rewardDescription: "Half price", completesCard: false },
  { atStamp: 9, rewardName: "Free full wash", rewardDescription: "On the house", completesCard: true },
];

test("a milestone becomes ready without completing the card", () => {
  const { getReadyRewards, isRewardReady } = rewards;

  assert.deepEqual(getReadyRewards({ earnedStamps: 4, bonusStamps: 0, rewards: CARD }), []);
  assert.equal(isRewardReady({ earnedStamps: 4, bonusStamps: 0, rewards: CARD }), false);

  const atFive = getReadyRewards({ earnedStamps: 5, bonusStamps: 0, rewards: CARD });
  assert.equal(atFive.length, 1);
  assert.equal(atFive[0].atStamp, 5);
  assert.equal(atFive[0].completesCard, false, "visit 5 must not complete the card");
});

test("claiming a milestone stops it being offered again on the same card", () => {
  const { getReadyRewards } = rewards;

  const afterClaim = getReadyRewards({
    earnedStamps: 6,
    bonusStamps: 0,
    rewards: CARD,
    claimedRewardStamps: [5],
  });
  assert.deepEqual(afterClaim, [], "the 50% was taken; nothing is waiting at visit 6");
});

test("two rewards can be waiting at once", () => {
  const { getReadyRewards } = rewards;

  // Never claimed the 50%, now reached the free wash.
  const both = getReadyRewards({ earnedStamps: 9, bonusStamps: 0, rewards: CARD });
  assert.deepEqual(both.map((r) => r.atStamp), [5, 9], "earliest first, and neither is hidden");

  // Staff must be able to see both; collapsing to one would silently drop a
  // reward the customer earned.
  assert.equal(both[0].completesCard, false);
  assert.equal(both[1].completesCard, true);
});

test("bonus stamps count toward rewards exactly as earned ones do", () => {
  const { getReadyRewards } = rewards;
  const viaBonus = getReadyRewards({ earnedStamps: 3, bonusStamps: 2, rewards: CARD });
  assert.equal(viaBonus.length, 1);
  assert.equal(viaBonus[0].atStamp, 5);
});

test("the countdown targets the next reward, not the last one", () => {
  const { getNextReward, stampsUntilNextReward } = rewards;

  // On visit 2 of a nine-slot card, the customer is 3 away from the discount -
  // not 7 away from the wash. Naming the final reward here is what makes a
  // milestone invisible, and an invisible milestone retains nobody.
  assert.equal(getNextReward({ earnedStamps: 2, bonusStamps: 0, rewards: CARD }).atStamp, 5);
  assert.equal(stampsUntilNextReward({ earnedStamps: 2, bonusStamps: 0, rewards: CARD }), 3);

  assert.equal(getNextReward({ earnedStamps: 6, bonusStamps: 0, rewards: CARD }).atStamp, 9);
  assert.equal(stampsUntilNextReward({ earnedStamps: 6, bonusStamps: 0, rewards: CARD }), 3);

  assert.equal(getNextReward({ earnedStamps: 9, bonusStamps: 0, rewards: CARD }), null);
  assert.equal(stampsUntilNextReward({ earnedStamps: 9, bonusStamps: 0, rewards: CARD }), null);
});

test("exactly one reward completes the card", () => {
  const { getCompletingReward } = rewards;
  assert.equal(getCompletingReward(CARD).atStamp, 9);
  assert.equal(getCompletingReward([]), null);
});

test("a single-reward program behaves exactly as it does today", () => {
  const { singleCardReward, getReadyRewards, isRewardReady, getRewardState, stampsUntilNextReward } = rewards;

  // This is what migration 0048 backfilled for every existing program, so the
  // old behaviour has to survive the rewrite untouched.
  const legacy = singleCardReward({ requiredStamps: 10, rewardName: "Free Coffee" });
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].atStamp, 10);
  assert.equal(legacy[0].completesCard, true);

  assert.equal(isRewardReady({ earnedStamps: 9, bonusStamps: 0, rewards: legacy }), false);
  assert.equal(isRewardReady({ earnedStamps: 10, bonusStamps: 0, rewards: legacy }), true);
  assert.equal(getRewardState({ earnedStamps: 10, bonusStamps: 0, rewards: legacy }), "REWARD_READY");
  assert.equal(getRewardState({ earnedStamps: 3, bonusStamps: 0, rewards: legacy }), "ACTIVE");
  assert.equal(
    getRewardState({ earnedStamps: 10, bonusStamps: 0, rewards: legacy, justRedeemed: true }),
    "REDEEMED",
  );
  assert.equal(stampsUntilNextReward({ earnedStamps: 4, bonusStamps: 0, rewards: legacy }), 6);

  // Overshooting still reads as ready - stamps can exceed the requirement.
  assert.equal(isRewardReady({ earnedStamps: 14, bonusStamps: 0, rewards: legacy }), true);

  // A program with a zero requirement must not produce a reward at stamp 0.
  assert.equal(singleCardReward({ requiredStamps: 0, rewardName: "x" })[0].atStamp, 1);
});

test("redemption resets the card only when the reward completes it", () => {
  const actions = read("src/app/scan/actions.ts");

  // The whole behavioural difference lives in this branch.
  assert.match(actions, /if \(claimed\.completesCard\) \{/);
  assert.match(actions, /claimedRewardStamps: \[\],/, "completing the card clears the claimed set");
  assert.match(actions, /event: "CARD_RESET"/, "completing the card still resets stamps");
  assert.match(
    actions,
    /claimedRewardStamps: \{ push: claimed\.atStamp \}/,
    "a milestone is recorded without touching the stamps",
  );

  // A milestone must not reset anything. earnedStamps:0 may appear only inside
  // the completesCard branch.
  const completing = actions.slice(actions.indexOf("if (claimed.completesCard) {"));
  const milestoneBranch = completing.slice(completing.indexOf("} else {"));
  assert.doesNotMatch(milestoneBranch.slice(0, 600), /earnedStamps: 0/, "a milestone must not zero the card");

  // Earliest-first is what protects an unclaimed milestone from being wiped.
  assert.match(actions, /const claimed = readyRewards\[0\];/);

  // The redemption records which reward it was, and the name as given.
  assert.match(actions, /programRewardId: claimedRow\?\.id \?\? null/);
  assert.match(actions, /rewardName: claimed\.rewardName/);
  assert.match(actions, /requiredStamps: claimed\.atStamp/);

  // Concurrency protection must survive untouched.
  assert.match(actions, /FOR UPDATE/);
  assert.match(actions, /idempotencyKey/);

  // Both the pre-check and the locked re-check read the real card.
  assert.equal((actions.match(/cardRewardsFor\(/g) ?? []).length >= 3, true);
  assert.match(actions, /programRewards: \{ orderBy: \{ atStamp: "asc" \} \}/);
});

test("the card and the Wallet pass name the next reward, not the last one", () => {
  const mapper = read("src/lib/google-wallet/mapper.ts");
  const card = read("src/app/card/[token]/page.tsx");
  const service = read("src/lib/google-wallet/service.ts");

  // An invisible milestone retains nobody - the paper card works precisely
  // because the badge at slot 5 is visible from day one.
  for (const [label, source] of [["wallet mapper", mapper], ["customer card", card]]) {
    assert.match(source, /getNextReward\(/, `${label} must count down to the next reward`);
    assert.match(source, /getReadyRewards\(/, `${label} must know what is waiting now`);
    assert.match(source, /claimedRewardStamps/, `${label} must exclude rewards already taken`);
  }

  // The old behaviour was a bare subtraction against the program's final
  // requirement; that is exactly what hides a milestone.
  assert.doesNotMatch(mapper, /required - progress/, "wallet must not count down to requiredStamps");
  assert.doesNotMatch(card, /Math\.max\(required - progress, 0\)/, "card must not count down to requiredStamps");

  // Both have to actually load the rewards, or they silently fall back.
  assert.match(service, /programRewards: \{ orderBy: \{ atStamp: "asc" \} \}/);
  assert.match(card, /programRewards: \{ orderBy: \{ atStamp: "asc" \} \}/);

  // Two rewards waiting must both be named rather than one hiding the other.
  assert.match(mapper, /readyRewards\.map\(\(reward\) => reward\.rewardName\)\.join\(" and "\)/);

  // A finished card has nothing to count down to and must not say "0 visits".
  assert.match(mapper, /All rewards on this card have been claimed\./);
});

test("the schema keeps completesCard and the claimed set together", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0048_program_rewards/migration.sql");

  assert.match(schema, /model ProgramReward/);
  assert.match(schema, /completesCard\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /@@unique\(\[loyaltyProgramId, atStamp\]\)/, "one reward per slot");
  assert.match(schema, /claimedRewardStamps\s+Int\[\]/);
  assert.match(schema, /programRewardId\s+Int\?/, "history predating milestones has no reward to point at");

  // The backfill is what lets the engine read the table without changing
  // behaviour, so it has to stay in the migration.
  assert.match(migration, /INSERT INTO "program_rewards"/);
  assert.match(migration, /FROM "loyalty_programs"/);
  assert.match(migration, /true,\s*\n\s*CURRENT_TIMESTAMP/, "backfilled rewards complete the card");
  assert.doesNotMatch(migration, /DROP /, "0048 must be additive");
});
