-- CreateTable
CREATE TABLE "public"."rate_limit_attempts" (
    "id" SERIAL NOT NULL,
    "scope" TEXT NOT NULL,
    "identifier" TEXT,
    "ip_address" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_attempts_scope_ip_address_created_at_idx" ON "public"."rate_limit_attempts"("scope", "ip_address", "created_at");

-- CreateIndex
CREATE INDEX "rate_limit_attempts_scope_identifier_created_at_idx" ON "public"."rate_limit_attempts"("scope", "identifier", "created_at");
