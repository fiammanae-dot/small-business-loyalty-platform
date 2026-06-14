-- Reward redemptions are an append-only audit ledger.
CREATE OR REPLACE FUNCTION "public"."prevent_reward_redemption_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'reward_redemptions are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "reward_redemptions_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "public"."reward_redemptions"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_reward_redemption_mutation"();
