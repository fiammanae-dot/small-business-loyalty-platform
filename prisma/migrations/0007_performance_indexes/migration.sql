-- Add performance indexes recommended by the Phase 6B readiness audit.
CREATE INDEX "business_customer_memberships_business_id_status_idx" ON "public"."business_customer_memberships"("business_id" ASC, "status" ASC);

CREATE INDEX "business_customer_memberships_business_id_created_branch_status_idx" ON "public"."business_customer_memberships"("business_id" ASC, "created_branch_id" ASC, "status" ASC);

CREATE INDEX "customer_program_memberships_loyalty_program_id_status_idx" ON "public"."customer_program_memberships"("loyalty_program_id" ASC, "status" ASC);

CREATE INDEX "loyalty_programs_business_id_active_idx" ON "public"."loyalty_programs"("business_id" ASC, "active" ASC);

CREATE INDEX "business_subscriptions_business_id_status_created_at_idx" ON "public"."business_subscriptions"("business_id" ASC, "status" ASC, "created_at" ASC);

CREATE INDEX "scan_events_business_id_created_at_idx" ON "public"."scan_events"("business_id" ASC, "created_at" ASC);
