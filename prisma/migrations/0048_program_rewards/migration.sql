-- Rewards at points on the card, not only at the end.
--
-- Al Bab Al Abyad's paper card gives 50% off at visit 5 and a free wash at
-- visit 9. Today the platform can only express the second: redemption and card
-- completion are the same act. This migration adds the shape needed to tell
-- them apart. It changes no behaviour on its own.
--
-- Additive and backward compatible: one new table, one new column on each of
-- two existing tables, and a backfill that gives every existing program exactly
-- one reward - at required_stamps, completing the card - which reproduces
-- today's behaviour precisely. No customer sees a difference.

-- CreateTable
CREATE TABLE "program_rewards" (
  "id"                 SERIAL       NOT NULL,
  "loyalty_program_id" INTEGER      NOT NULL,
  "at_stamp"           INTEGER      NOT NULL,
  "reward_name"        TEXT         NOT NULL,
  "reward_description" TEXT         NOT NULL,
  "completes_card"     BOOLEAN      NOT NULL DEFAULT false,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "program_rewards_pkey" PRIMARY KEY ("id")
);

-- A card cannot carry two rewards at the same stamp.
CREATE UNIQUE INDEX "program_rewards_loyalty_program_id_at_stamp_key"
  ON "program_rewards"("loyalty_program_id", "at_stamp");

CREATE INDEX "program_rewards_loyalty_program_id_idx"
  ON "program_rewards"("loyalty_program_id");

ALTER TABLE "program_rewards"
  ADD CONSTRAINT "program_rewards_loyalty_program_id_fkey"
  FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: which rewards are already claimed on the CURRENT card.
-- Cleared on reset, so the visit-5 discount comes back on the next card but
-- cannot be taken twice on this one.
ALTER TABLE "customer_program_memberships"
  ADD COLUMN "claimed_reward_stamps" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- AlterTable: which reward a redemption was for. Nullable, because redemptions
-- recorded before this migration have no row to point at and history is not
-- rewritten.
ALTER TABLE "reward_redemptions"
  ADD COLUMN "program_reward_id" INTEGER;

CREATE INDEX "reward_redemptions_program_reward_id_idx"
  ON "reward_redemptions"("program_reward_id");

ALTER TABLE "reward_redemptions"
  ADD CONSTRAINT "reward_redemptions_program_reward_id_fkey"
  FOREIGN KEY ("program_reward_id") REFERENCES "program_rewards"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing program gets the reward it already has, at the
-- stamp count it already completes on. After this, "the program's reward" and
-- "the program's only ProgramReward" are the same thing, so the engine can be
-- rewritten to read the table without any program behaving differently.
INSERT INTO "program_rewards" (
  "loyalty_program_id", "at_stamp", "reward_name", "reward_description", "completes_card", "updated_at"
)
SELECT
  p."id",
  GREATEST(p."required_stamps", 1),
  p."reward_name",
  p."reward_description",
  true,
  CURRENT_TIMESTAMP
FROM "loyalty_programs" p
ON CONFLICT ("loyalty_program_id", "at_stamp") DO NOTHING;

-- Point historical redemptions at the reward they must have been for. Only
-- rows whose required_stamps matches the card's completion point - anything
-- else predates a schema change and is left null rather than guessed at.
UPDATE "reward_redemptions" r
SET "program_reward_id" = pr."id"
FROM "program_rewards" pr
WHERE pr."loyalty_program_id" = r."loyalty_program_id"
  AND pr."at_stamp" = r."required_stamps"
  AND r."program_reward_id" IS NULL;
