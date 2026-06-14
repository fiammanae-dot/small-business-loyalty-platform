CREATE TABLE "audit_events" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_user_id" INTEGER,
  "business_id" INTEGER,
  "branch_id" INTEGER,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cooldown_rules" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Default cooldown policy',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "minimum_minutes_between_stamps" INTEGER NOT NULL DEFAULT 0,
  "maximum_stamps_per_transaction" INTEGER NOT NULL DEFAULT 5,
  "maximum_stamps_per_customer_per_day" INTEGER,
  "maximum_stamps_per_staff_per_day" INTEGER,
  "generate_alert" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cooldown_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cooldown_events" (
  "id" SERIAL NOT NULL,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" INTEGER NOT NULL,
  "branch_id" INTEGER,
  "customer_program_membership_id" INTEGER NOT NULL,
  "staff_user_id" INTEGER NOT NULL,
  "loyalty_program_id" INTEGER NOT NULL,
  "cooldown_rule_id" INTEGER,
  "violation_type" TEXT NOT NULL,
  "attempted_quantity" INTEGER NOT NULL,
  "override_used" BOOLEAN NOT NULL DEFAULT false,
  "override_reason" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cooldown_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audit_events_uuid_key" ON "audit_events"("uuid");
CREATE INDEX "audit_events_business_id_created_at_idx" ON "audit_events"("business_id", "created_at");
CREATE INDEX "audit_events_actor_user_id_created_at_idx" ON "audit_events"("actor_user_id", "created_at");
CREATE INDEX "audit_events_action_created_at_idx" ON "audit_events"("action", "created_at");
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

CREATE UNIQUE INDEX "cooldown_rules_uuid_key" ON "cooldown_rules"("uuid");
CREATE INDEX "cooldown_rules_business_id_active_idx" ON "cooldown_rules"("business_id", "active");

CREATE UNIQUE INDEX "cooldown_events_uuid_key" ON "cooldown_events"("uuid");
CREATE INDEX "cooldown_events_business_id_created_at_idx" ON "cooldown_events"("business_id", "created_at");
CREATE INDEX "cooldown_events_business_id_violation_type_created_at_idx" ON "cooldown_events"("business_id", "violation_type", "created_at");
CREATE INDEX "cooldown_events_customer_program_membership_id_created_at_idx" ON "cooldown_events"("customer_program_membership_id", "created_at");
CREATE INDEX "cooldown_events_staff_user_id_created_at_idx" ON "cooldown_events"("staff_user_id", "created_at");
CREATE INDEX "cooldown_events_branch_id_created_at_idx" ON "cooldown_events"("branch_id", "created_at");

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "cooldown_rules" ADD CONSTRAINT "cooldown_rules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cooldown_events" ADD CONSTRAINT "cooldown_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cooldown_events" ADD CONSTRAINT "cooldown_events_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "cooldown_events" ADD CONSTRAINT "cooldown_events_customer_program_membership_id_fkey" FOREIGN KEY ("customer_program_membership_id") REFERENCES "customer_program_memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "cooldown_events" ADD CONSTRAINT "cooldown_events_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "cooldown_events" ADD CONSTRAINT "cooldown_events_loyalty_program_id_fkey" FOREIGN KEY ("loyalty_program_id") REFERENCES "loyalty_programs"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "cooldown_events" ADD CONSTRAINT "cooldown_events_cooldown_rule_id_fkey" FOREIGN KEY ("cooldown_rule_id") REFERENCES "cooldown_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cooldown_rules" ADD CONSTRAINT "cooldown_rules_minimum_minutes_check" CHECK ("minimum_minutes_between_stamps" >= 0);
ALTER TABLE "cooldown_rules" ADD CONSTRAINT "cooldown_rules_max_transaction_check" CHECK ("maximum_stamps_per_transaction" BETWEEN 1 AND 5);
ALTER TABLE "cooldown_rules" ADD CONSTRAINT "cooldown_rules_max_customer_day_check" CHECK ("maximum_stamps_per_customer_per_day" IS NULL OR "maximum_stamps_per_customer_per_day" >= 1);
ALTER TABLE "cooldown_rules" ADD CONSTRAINT "cooldown_rules_max_staff_day_check" CHECK ("maximum_stamps_per_staff_per_day" IS NULL OR "maximum_stamps_per_staff_per_day" >= 1);
ALTER TABLE "cooldown_events" ADD CONSTRAINT "cooldown_events_attempted_quantity_check" CHECK ("attempted_quantity" BETWEEN 1 AND 5);
