-- Phase 3: prepaid membership sessions with monthly use-it-or-lose-it forfeit.
ALTER TABLE "customer_program_memberships" ADD COLUMN "sessions_forfeited" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "customer_program_memberships" ADD COLUMN "forfeit_cycles_processed" INTEGER NOT NULL DEFAULT 0;
