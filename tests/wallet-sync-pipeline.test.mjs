import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("wallet sync service is provider-agnostic and reusable across Design Studio flows", () => {
  const types = read("src/lib/wallet-sync/types.ts");
  const registry = read("src/lib/wallet-sync/registry.ts");
  const index = read("src/lib/wallet-sync/index.ts");

  assert.match(types, /export interface WalletProvider/);
  assert.match(types, /syncProgramCardDesign\(context: WalletSyncContext\): Promise<WalletSyncOutcome>/);
  assert.match(registry, /export function registerProvider/);
  assert.match(registry, /export function getRegisteredProviders/);
  assert.match(index, /export async function syncWalletProvidersForProgram/);
  assert.match(index, /export function summarizeWalletSyncForUser/);
  assert.match(index, /registerProvider\(googleWalletProvider\)/);
});

test("wallet sync pipeline never throws out of a provider failure", () => {
  const index = read("src/lib/wallet-sync/index.ts");

  assert.match(index, /async function runProviderSafely/);
  assert.match(index, /try \{\s*return await provider\.syncProgramCardDesign\(context\);/);
  assert.match(index, /status: "failed"/);
});

test("google wallet provider reuses the existing service instead of duplicating sync logic", () => {
  const provider = read("src/lib/wallet-sync/providers/google-wallet-provider.ts");
  const service = read("src/lib/google-wallet/service.ts");

  assert.match(provider, /import \{ syncGoogleWalletClassForProgram \} from "@\/lib\/google-wallet\/service"/);
  assert.doesNotMatch(provider, /createGoogleWalletApiClient|buildGoogleWalletClassPayload|prisma\./);
  assert.match(service, /export async function syncGoogleWalletClassForProgram/);
  assert.match(service, /await ensureGoogleWalletClass\(\{/);
});

test("class-only sync updates the shared Google Wallet Class without touching per-customer Objects", () => {
  const service = read("src/lib/google-wallet/service.ts");
  const classFn = service.slice(
    service.indexOf("export async function syncGoogleWalletClassForProgram"),
    service.indexOf("export async function syncGoogleWalletObject("),
  );

  assert.match(classFn, /prisma\.googleWalletClass\.findUnique/);
  assert.doesNotMatch(classFn, /findMany/);
  assert.doesNotMatch(classFn, /buildGoogleWalletObjectPayload/);
  assert.doesNotMatch(classFn, /googleWalletObject\.(upsert|update|create)/);
});

test("google wallet provider skips gracefully instead of throwing when not configured", () => {
  const provider = read("src/lib/wallet-sync/providers/google-wallet-provider.ts");
  const service = read("src/lib/google-wallet/service.ts");

  assert.match(provider, /NOT_CONFIGURED: "not configured"/);
  assert.match(service, /if \(!config\) \{\s*return \{ ok: true, skipped: true, reason: "NOT_CONFIGURED" \};/);
});

test("Design Studio save triggers wallet sync after the design write and never rolls back on failure", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");

  assert.match(actions, /import \{ summarizeWalletSyncForUser, syncWalletProvidersForProgram \} from "@\/lib\/wallet-sync"/);

  const fnBody = actions.slice(
    actions.indexOf("export async function updateProgramDesignStudioAction"),
    actions.indexOf("export async function saveBusinessDesignPresetAction"),
  );

  const designWriteIndex = fnBody.indexOf("prisma.loyaltyProgram.update");
  const walletSyncIndex = fnBody.indexOf("synchronizeWalletProvidersSafely(");
  assert.ok(designWriteIndex > -1 && walletSyncIndex > -1 && designWriteIndex < walletSyncIndex, "design must be saved before wallet sync runs");

  assert.match(fnBody, /synchronizeWalletProvidersSafely\(\{\s*programId: program\.id,\s*programUuid: program\.uuid,\s*businessId: user\.businessId,\s*\}\)/);
  assert.doesNotMatch(fnBody, /catch[\s\S]*?fail\(/);

  assert.match(actions, /async function synchronizeWalletProvidersSafely/);
  assert.match(actions, /catch \(error\) \{\s*console\.warn\("\[wallet-sync\] unexpected failure during Design Studio save", error\);\s*return \[\];/);
});

test("Design Studio success message reflects wallet sync status without exposing internals", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");
  const index = read("src/lib/wallet-sync/index.ts");

  assert.match(actions, /summarizeWalletSyncForUser\(walletOutcomes\)/);
  assert.match(actions, /redirect\(`\$\{path\}\?success=\$\{encodeURIComponent\(successMessage\)\}`\)/);
  assert.doesNotMatch(index, /error\.stack/);
  assert.match(index, /synchronized\.`/);
  assert.match(index, /synchronization skipped/);
});

test("single source of truth is preserved: no card design duplication on customer records", () => {
  const schema = read("prisma/schema.prisma");
  const provider = read("src/lib/wallet-sync/providers/google-wallet-provider.ts");
  const mapper = read("src/lib/google-wallet/mapper.ts");

  const membershipModel = schema.slice(schema.indexOf("model CustomerProgramMembership"), schema.indexOf("model GoogleWalletClass"));
  assert.doesNotMatch(membershipModel, /cardDesign/);
  assert.doesNotMatch(provider, /cardDesign/);
  assert.match(mapper, /const cardDesign = membership\.loyaltyProgram\.cardDesign/);
});

test("apple wallet remains a registration extension point, not a Design Studio code change", () => {
  const index = read("src/lib/wallet-sync/index.ts");
  const registry = read("src/lib/wallet-sync/registry.ts");
  const actions = read("src/app/dashboard/programs/actions.ts");

  assert.match(index, /Apple Wallet, Samsung Wallet, or/);
  assert.match(registry, /providers\.push\(provider\)/);
  assert.doesNotMatch(actions, /[Aa]pple/);
});
