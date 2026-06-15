ALTER TABLE "users"
ADD COLUMN "force_password_change" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "last_login_at" TIMESTAMP(3);

CREATE INDEX "users_business_id_role_idx" ON "users"("business_id", "role");
CREATE INDEX "users_email_role_idx" ON "users"("email", "role");
