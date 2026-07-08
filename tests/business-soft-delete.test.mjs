import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Business model has additive soft-delete/archive fields", () => {
  const schema = read("prisma/schema.prisma");

  assert.match(
    schema,
    /model Business \{[\s\S]*?deletedAt\s+DateTime\?\s+@map\("deleted_at"\)[\s\S]*?archivedAt\s+DateTime\?\s+@map\("archived_at"\)[\s\S]*?archivedById\s+Int\?\s+@map\("archived_by_id"\)[\s\S]*?archiveReason\s+String\?\s+@map\("archive_reason"\)/,
    "Business must have deletedAt, archivedAt, archivedById, and archiveReason fields",
  );
  assert.match(schema, /archivedBy\s+User\?\s+@relation\("BusinessArchivedBy", fields: \[archivedById\], references: \[id\]\)/);
  assert.match(schema, /archivedBusinesses Business\[\] @relation\("BusinessArchivedBy"\)/);
});

test("AuditEvent no longer cascade-deletes when a business is removed", () => {
  const schema = read("prisma/schema.prisma");

  assert.match(
    schema,
    /model AuditEvent \{[\s\S]*?business\s+Business\?\s+@relation\(fields: \[businessId\], references: \[id\], onDelete: SetNull\)/,
    "AuditEvent.business must use SetNull, not Cascade, so audit history survives even a hard delete",
  );
  assert.doesNotMatch(
    schema.match(/model AuditEvent \{[\s\S]*?\n\}/)?.[0] ?? "",
    /onDelete:\s*Cascade/,
    "AuditEvent relations must never cascade-delete",
  );
});

test("migration adds soft-delete columns and switches the audit_events FK to SET NULL", () => {
  const migration = read("prisma/migrations/0044_business_soft_delete/migration.sql");

  assert.match(migration, /ADD COLUMN "deleted_at"/);
  assert.match(migration, /ADD COLUMN "archived_at"/);
  assert.match(migration, /ADD COLUMN "archived_by_id"/);
  assert.match(migration, /ADD COLUMN "archive_reason"/);
  assert.match(migration, /DROP CONSTRAINT "audit_events_business_id_fkey"/);
  assert.match(migration, /"audit_events_business_id_fkey".*ON DELETE SET NULL/);
});

test("archiveBusinessAction sets ARCHIVED status, records archive metadata, and logs an audit event without deleting anything", () => {
  const actions = read("src/app/platform/businesses/actions.ts");

  assert.match(actions, /export async function archiveBusinessAction/);
  assert.match(actions, /requireRole\("PLATFORM_OWNER"\)/);
  assert.match(actions, /archiveReason:\s*z\.string\(\)\.trim\(\)\.min\(1/, "an archive reason must be required, not optional");
  assert.match(actions, /status:\s*"ARCHIVED"/);
  assert.match(actions, /deletedAt:\s*now/);
  assert.match(actions, /archivedAt:\s*now/);
  assert.match(actions, /archivedById:\s*platformUser\.id/);
  assert.match(actions, /action:\s*"BUSINESS_ARCHIVED"/);
  assert.doesNotMatch(actions, /business\.delete\(/, "archiving must never hard-delete the business row");
  assert.doesNotMatch(actions, /auditEvent\.delete/, "archiving must never delete AuditEvent rows");
});

test("restoreBusinessAction clears archive fields, returns the business to INACTIVE, and logs an audit event", () => {
  const actions = read("src/app/platform/businesses/actions.ts");

  assert.match(actions, /export async function restoreBusinessAction/);
  assert.match(actions, /status:\s*"INACTIVE"/);
  assert.match(actions, /deletedAt:\s*null/);
  assert.match(actions, /archivedAt:\s*null/);
  assert.match(actions, /archivedById:\s*null/);
  assert.match(actions, /archiveReason:\s*null/);
  assert.match(actions, /action:\s*"BUSINESS_RESTORED"/);
});

test("businesses list hides archived businesses by default and exposes a filter to view them", () => {
  const page = read("src/app/platform/businesses/page.tsx");

  assert.match(page, /validStatuses:\s*RecordStatus\[\]\s*=\s*\["ACTIVE",\s*"INACTIVE",\s*"ARCHIVED"\]/);
  assert.match(
    page,
    /selectedStatus \? \{ status: selectedStatus \} : \{ status: \{ not: "ARCHIVED" \} \}/,
    "default business list query must exclude ARCHIVED unless explicitly filtered",
  );
  assert.match(page, /status:\s*"ARCHIVED"[\s\S]{0,80}label="Archived"/);
});

test("business detail page offers Archive (with required reason) and Restore controls, not a hard delete", () => {
  const page = read("src/app/platform/businesses/[id]/page.tsx");

  assert.match(page, /import\s*\{[^}]*archiveBusinessAction[^}]*restoreBusinessAction[^}]*\}\s*from\s*"@\/app\/platform\/businesses\/actions"/);
  assert.match(page, /action=\{archiveBusinessAction\}/);
  assert.match(page, /action=\{restoreBusinessAction\}/);
  assert.match(page, /name="archiveReason"\s*\n\s*required/);
  assert.doesNotMatch(page, /business\.delete\(/);
});
