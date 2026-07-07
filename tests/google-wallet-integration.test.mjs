import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("google wallet schema stores classes and objects without changing customer records", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/0041_google_wallet_integration/migration.sql");

  assert.match(schema, /model GoogleWalletClass/);
  assert.match(schema, /model GoogleWalletObject/);
  assert.match(schema, /loyaltyProgramId\s+Int\s+@unique/);
  assert.match(schema, /customerProgramMembershipId\s+Int\s+@unique/);
  assert.match(migration, /CREATE TABLE "google_wallet_classes"/);
  assert.match(migration, /CREATE TABLE "google_wallet_objects"/);
  assert.doesNotMatch(migration, /ALTER TABLE "business_customer_memberships"\s+ADD/i);
  assert.doesNotMatch(migration, /ALTER TABLE "customer_program_memberships"\s+ADD/i);
});

test("google wallet secrets are server-only and documented in env example", () => {
  const env = read(".env.example");
  const config = read("src/lib/google-wallet/config.ts");
  const service = read("src/lib/google-wallet/service.ts");

  for (const key of ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"]) {
    assert.match(env, new RegExp(key));
    assert.match(config, new RegExp(key));
  }
  assert.match(config, /import "server-only"/);
  assert.match(service, /import "server-only"/);
  assert.doesNotMatch(read("src/components/CardShareActions.tsx"), /GOOGLE_PRIVATE_KEY|GOOGLE_SERVICE_ACCOUNT_EMAIL/);
});

test("save endpoint validates active scan token and redirects to signed google wallet save URL", () => {
  const route = read("src/app/api/wallet/google/save/[scanToken]/route.ts");
  const jwt = read("src/lib/google-wallet/jwt.ts");

  assert.match(route, /customerProgramMembership\.findUnique/);
  assert.match(route, /scanStatus !== "ACTIVE"/);
  assert.match(route, /cardStatus !== "ACTIVE"/);
  assert.match(route, /createGoogleWalletSaveLink/);
  assert.match(route, /NextResponse\.redirect\(saveUrl/);
  assert.match(jwt, /typ: "savetowallet"/);
  assert.match(jwt, /https:\/\/pay\.google\.com\/gp\/v\/save\/\$\{token\}/);
});

test("wallet object sync is triggered after loyalty progress changes", () => {
  const scanActions = read("src/app/scan/actions.ts");
  const dashboardActions = read("src/app/dashboard/actions.ts");

  assert.match(scanActions, /syncGoogleWalletObjectAfterLoyaltyChange\(programMembership\.id\)/);
  assert.match(scanActions, /syncGoogleWalletObjectAfterLoyaltyChange\(programMembership\.id\)/g);
  assert.match(dashboardActions, /syncGoogleWalletObjectAfterLoyaltyChange\(programMembership\.id\)/);
});

test("public card and customer 360 expose real google wallet save links", () => {
  const publicCard = read("src/app/card/[token]/page.tsx");
  const customer360 = read("src/app/dashboard/customers/[id]/page.tsx");
  const shareActions = read("src/components/CardShareActions.tsx");

  assert.match(publicCard, /\/api\/wallet\/google\/save\/\$\{primaryProgram\.programMembership\.scanToken\}/);
  assert.match(customer360, /googleWalletUrl: `\/api\/wallet\/google\/save\/\$\{programMembership\.scanToken\}`/);
  assert.match(customer360, /Google Wallet:/);
  assert.match(customer360, /Regenerate Google Wallet pass/);
  assert.match(shareActions, /googleWalletUrl\?: string \| null/);
  assert.match(shareActions, /Add to Google Wallet/);
  assert.doesNotMatch(shareActions, /Google Wallet pass is not available yet\./);
});

test("google wallet documentation package exists", () => {
  assert.match(read("docs/google-wallet/setup.md"), /GOOGLE_WALLET_ISSUER_ID/);
  assert.match(read("docs/google-wallet/deployment.md"), /0041_google_wallet_integration/);
  assert.match(read("docs/google-wallet/production-checklist.md"), /Google Console/);
});
