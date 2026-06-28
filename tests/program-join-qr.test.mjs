import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("loyalty programs have a secure public join token migration", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0036_program_join_tokens/migration.sql");

  assert.match(schema, /joinToken\s+String\s+@unique\s+@default\(uuid\(\)\)\s+@map\("join_token"\)\s+@db\.Uuid/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "join_token" UUID/);
  assert.match(migration, /gen_random_uuid\(\)/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_programs_join_token_key"/);
});

test("public program join page renders enrollment and verified card success", () => {
  const page = read("src/app/join/program/[token]/page.tsx");
  const action = read("src/app/join/program/[token]/actions.ts");

  assert.match(page, /where: \{ joinToken: token \}/);
  assert.match(page, /program\.active/);
  assert.match(page, /program\.business\.status !== "ACTIVE"/);
  assert.match(page, /joinProgramAction/);
  assert.match(page, /name="firstName"/);
  assert.match(page, /name="lastName"/);
  assert.match(page, /name="phone"/);
  assert.match(page, /getCardUrl\(successMembership\.cardToken\)/);
  assert.match(page, /Open My Loyalty Card/);

  assert.match(action, /normalizePhone/);
  assert.match(action, /findUnique\(\{\s*where: \{ joinToken: parsed\.data\.token \}/s);
  assert.match(action, /businessId_globalCustomerId/);
  assert.match(action, /programMemberships\.length === 0/);
  assert.match(action, /enrollmentSource: "SELF_SIGNUP"/);
  assert.match(action, /scanToken: generateScanToken\(\)/);
  assert.match(action, /cardToken: generateCardToken\(\)/);
  assert.doesNotMatch(action, /stampTransaction\.create/);
  assert.doesNotMatch(action, /rewardRedemption\.create/);
});

test("business owner program detail exposes join QR controls without changing scanner flow", () => {
  const detail = read("src/app/dashboard/programs/[id]/page.tsx");
  const poster = read("src/app/dashboard/programs/[id]/join-poster/page.tsx");
  const helper = read("src/lib/program-join.ts");

  assert.match(helper, /\/join\/program\/\$\{token\}/);
  assert.match(helper, /QRCode\.toDataURL/);
  assert.match(detail, /Program Join QR/);
  assert.match(detail, /getProgramJoinUrl\(program\.joinToken\)/);
  assert.match(detail, /getProgramJoinQrDataUrl\(program\.joinToken\)/);
  assert.match(detail, /CopyButton value=\{joinUrl\}/);
  assert.match(detail, /Open Join Page/);
  assert.match(detail, /\/join-poster/);

  assert.ok(existsSync("src/components/PrintPageButton.tsx"));
  assert.match(poster, /getBusinessOwnerContext/);
  assert.match(poster, /where: \{ uuid: id, businessId: user\.businessId \}/);
  assert.match(poster, /Scan to join our loyalty program/);
  assert.match(poster, /PrintPageButton/);
  assert.match(poster, /getProgramJoinQrDataUrl\(program\.joinToken\)/);
});
