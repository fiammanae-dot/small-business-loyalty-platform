DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."loyalty_programs" WHERE "required_stamps" < 1) THEN
    RAISE EXCEPTION 'Cannot add loyalty_programs required_stamps constraint: existing data violates required_stamps >= 1';
  END IF;

  IF EXISTS (SELECT 1 FROM "public"."loyalty_programs" WHERE "starting_bonus_stamps" < 0 OR "starting_bonus_stamps" > "required_stamps") THEN
    RAISE EXCEPTION 'Cannot add loyalty_programs bonus constraints: existing data violates bonus stamp rules';
  END IF;

  IF EXISTS (SELECT 1 FROM "public"."customer_program_memberships" WHERE "earned_stamps" < 0 OR "bonus_stamps" < 0) THEN
    RAISE EXCEPTION 'Cannot add customer_program_memberships stamp constraints: existing data has negative stamps';
  END IF;

  IF EXISTS (SELECT 1 FROM "public"."stamp_transactions" WHERE "quantity" < 1 OR "quantity" > 5) THEN
    RAISE EXCEPTION 'Cannot add stamp_transactions quantity constraint: existing data violates quantity 1..5';
  END IF;

  IF EXISTS (SELECT 1 FROM "public"."invoices" WHERE "amount" < 0) THEN
    RAISE EXCEPTION 'Cannot add invoices amount constraint: existing data has negative invoice amounts';
  END IF;

  IF EXISTS (SELECT 1 FROM "public"."payments" WHERE "amount" < 0) THEN
    RAISE EXCEPTION 'Cannot add payments amount constraint: existing data has negative payment amounts';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."subscription_plans"
    WHERE "max_branches" < 1 OR "max_loyalty_programs" < 1 OR "price_monthly" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot add subscription_plans constraints: existing data violates plan limit or price rules';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "business_id"
      FROM "public"."business_subscriptions"
      WHERE "status" IN ('TRIAL', 'ACTIVE')
      GROUP BY "business_id"
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION 'Cannot add active/trial subscription uniqueness: a business has multiple active or trial subscriptions';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."users" users
    JOIN "public"."branches" branches ON branches."id" = users."branch_id"
    WHERE users."branch_id" IS NOT NULL
      AND (users."business_id" IS NULL OR branches."business_id" <> users."business_id")
  ) THEN
    RAISE EXCEPTION 'Cannot add user branch tenant protection: existing users have branch/business mismatches';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."business_customer_memberships" memberships
    JOIN "public"."branches" branches ON branches."id" = memberships."created_branch_id"
    WHERE memberships."created_branch_id" IS NOT NULL
      AND branches."business_id" <> memberships."business_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add customer membership branch tenant protection: existing memberships have branch/business mismatches';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."stamp_transactions" transactions
    JOIN "public"."branches" branches ON branches."id" = transactions."branch_id"
    WHERE transactions."branch_id" IS NOT NULL
      AND branches."business_id" <> transactions."business_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add stamp transaction branch tenant protection: existing transactions have branch/business mismatches';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."scan_events" events
    JOIN "public"."branches" branches ON branches."id" = events."branch_id"
    WHERE events."branch_id" IS NOT NULL
      AND branches."business_id" <> events."business_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add scan event branch tenant protection: existing scan events have branch/business mismatches';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."reward_redemptions" redemptions
    JOIN "public"."branches" branches ON branches."id" = redemptions."branch_id"
    WHERE redemptions."branch_id" IS NOT NULL
      AND branches."business_id" <> redemptions."business_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add reward redemption branch tenant protection: existing redemptions have branch/business mismatches';
  END IF;
END;
$$;

ALTER TABLE "public"."loyalty_programs"
  ADD CONSTRAINT "loyalty_programs_required_stamps_min_check" CHECK ("required_stamps" >= 1),
  ADD CONSTRAINT "loyalty_programs_starting_bonus_min_check" CHECK ("starting_bonus_stamps" >= 0),
  ADD CONSTRAINT "loyalty_programs_starting_bonus_lte_required_check" CHECK ("starting_bonus_stamps" <= "required_stamps");

ALTER TABLE "public"."customer_program_memberships"
  ADD CONSTRAINT "customer_program_memberships_earned_stamps_min_check" CHECK ("earned_stamps" >= 0),
  ADD CONSTRAINT "customer_program_memberships_bonus_stamps_min_check" CHECK ("bonus_stamps" >= 0);

ALTER TABLE "public"."stamp_transactions"
  ADD CONSTRAINT "stamp_transactions_quantity_range_check" CHECK ("quantity" >= 1 AND "quantity" <= 5);

ALTER TABLE "public"."invoices"
  ADD CONSTRAINT "invoices_amount_min_check" CHECK ("amount" >= 0);

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_amount_min_check" CHECK ("amount" >= 0);

ALTER TABLE "public"."subscription_plans"
  ADD CONSTRAINT "subscription_plans_max_branches_min_check" CHECK ("max_branches" >= 1),
  ADD CONSTRAINT "subscription_plans_max_loyalty_programs_min_check" CHECK ("max_loyalty_programs" >= 1),
  ADD CONSTRAINT "subscription_plans_price_monthly_min_check" CHECK ("price_monthly" >= 0);

CREATE UNIQUE INDEX "business_subscriptions_one_active_or_trial_per_business_idx"
ON "public"."business_subscriptions"("business_id")
WHERE "status" IN ('TRIAL', 'ACTIVE');

CREATE OR REPLACE FUNCTION "public"."prevent_user_branch_business_mismatch"()
RETURNS trigger AS $$
DECLARE
  branch_business_id integer;
BEGIN
  IF NEW."branch_id" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW."business_id" IS NULL THEN
    RAISE EXCEPTION 'users.branch_id requires matching business_id';
  END IF;

  SELECT "business_id" INTO branch_business_id
  FROM "public"."branches"
  WHERE "id" = NEW."branch_id";

  IF branch_business_id IS NULL OR branch_business_id <> NEW."business_id" THEN
    RAISE EXCEPTION 'users.branch_id must belong to the same business_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "users_prevent_branch_business_mismatch"
BEFORE INSERT OR UPDATE OF "business_id", "branch_id" ON "public"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_user_branch_business_mismatch"();

CREATE OR REPLACE FUNCTION "public"."prevent_created_branch_business_mismatch"()
RETURNS trigger AS $$
DECLARE
  branch_business_id integer;
BEGIN
  IF NEW."created_branch_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "business_id" INTO branch_business_id
  FROM "public"."branches"
  WHERE "id" = NEW."created_branch_id";

  IF branch_business_id IS NULL OR branch_business_id <> NEW."business_id" THEN
    RAISE EXCEPTION 'business_customer_memberships.created_branch_id must belong to the same business_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "business_customer_memberships_prevent_created_branch_business_mismatch"
BEFORE INSERT OR UPDATE OF "business_id", "created_branch_id" ON "public"."business_customer_memberships"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_created_branch_business_mismatch"();

CREATE OR REPLACE FUNCTION "public"."prevent_branch_business_mismatch"()
RETURNS trigger AS $$
DECLARE
  branch_business_id integer;
BEGIN
  IF NEW."branch_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "business_id" INTO branch_business_id
  FROM "public"."branches"
  WHERE "id" = NEW."branch_id";

  IF branch_business_id IS NULL OR branch_business_id <> NEW."business_id" THEN
    RAISE EXCEPTION '% branch_id must belong to the same business_id', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "stamp_transactions_prevent_branch_business_mismatch"
BEFORE INSERT OR UPDATE OF "business_id", "branch_id" ON "public"."stamp_transactions"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_branch_business_mismatch"();

CREATE TRIGGER "scan_events_prevent_branch_business_mismatch"
BEFORE INSERT OR UPDATE OF "business_id", "branch_id" ON "public"."scan_events"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_branch_business_mismatch"();

CREATE TRIGGER "reward_redemptions_prevent_branch_business_mismatch"
BEFORE INSERT OR UPDATE OF "business_id", "branch_id" ON "public"."reward_redemptions"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_branch_business_mismatch"();
