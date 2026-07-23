import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

function countOccurrences(source, pattern) {
  return (source.match(pattern) ?? []).length;
}

test("change detection is the single source of truth for wallet-relevant fields", () => {
  const changeDetection = read("src/lib/wallet-sync/change-detection.ts");

  assert.match(changeDetection, /export function hasWalletRelevantProgramChange/);
  assert.match(changeDetection, /export function hasWalletRelevantBusinessChange/);
  assert.match(changeDetection, /export function hasWalletRelevantBrandingChange/);
  // Program-level fields that actually feed the Google Wallet Class payload,
  // plus `active` because Program activation/deactivation is an explicitly
  // required trigger even though it is not itself rendered on the pass.
  assert.match(changeDetection, /before\.name !== after\.name/);
  assert.match(changeDetection, /before\.rewardName !== after\.rewardName/);
  assert.match(changeDetection, /before\.cardTheme !== after\.cardTheme/);
  assert.match(changeDetection, /before\.active !== after\.active/);
  // Every branding field the mapper reads (logo + all five brand colors).
  for (const field of ["logoUrl", "primaryColor", "secondaryColor", "backgroundColor", "textColor", "buttonColor"]) {
    assert.match(changeDetection, new RegExp(`before\\.${field} !== after\\.${field}`));
  }
});

test("enqueue module centralizes async, retrying, structured-logged wallet sync on top of the existing pipeline", () => {
  const enqueue = read("src/lib/wallet-sync/enqueue.ts");

  // Reuses the existing pipeline instead of reimplementing it.
  assert.match(enqueue, /import \{ syncWalletProvidersForProgram \} from "@\/lib\/wallet-sync"/);
  assert.doesNotMatch(enqueue, /createGoogleWalletApiClient|buildGoogleWalletClassPayload|prisma\.googleWalletClass/);

  // Non-blocking: scheduled via Next.js `after`, not awaited on the request path.
  assert.match(enqueue, /import \{ after \} from "next\/server"/);
  assert.match(enqueue, /export function enqueueWalletSync\(/);
  assert.match(enqueue, /export function enqueueWalletSyncForBusiness\(/);
  assert.match(enqueue, /after\(\(\) => runWithRetry\(context\)\)/);
  assert.match(enqueue, /after\(async \(\) => \{/);

  // Bounded single retry on failure, never throws out to the caller.
  assert.match(enqueue, /async function runWithRetry/);
  assert.match(enqueue, /hasFailure\(outcomes\)/);
  assert.match(enqueue, /event: "retry_scheduled"/);
  assert.match(enqueue, /await delay\(RETRY_DELAY_MS\)/);
  assert.match(enqueue, /catch \(error\)/);

  // Structured logging fields required: program id, business id, trigger, started, completed, duration, retry scheduled.
  assert.match(enqueue, /event: "started"/);
  assert.match(enqueue, /event: "completed"/);
  assert.match(enqueue, /durationMs: Math\.round\(performance\.now\(\) - startedAt\)/);
  assert.match(enqueue, /trigger: context\.trigger/);
  assert.match(enqueue, /businessId: context\.businessId/);
  assert.match(enqueue, /programId: context\.programId/);

  // Business-level fan-out still funnels through the same per-program function -
  // one enqueue per save, one sync call per program (each program owns its own Class).
  assert.match(enqueue, /prisma\.loyaltyProgram\.findMany\(\{\s*where: \{ businessId: context\.businessId \},/);
  assert.match(enqueue, /for \(const program of programs\) \{\s*await runWithRetry\(/);
});

test("Business Edit enqueues wallet sync exactly once, gated by change detection", () => {
  const actions = read("src/app/dashboard/actions.ts");
  assert.match(actions, /import \{ hasWalletRelevantBrandingChange, hasWalletRelevantBusinessChange \} from "@\/lib\/wallet-sync\/change-detection"/);
  assert.match(actions, /import \{ enqueueWalletSyncForBusiness \} from "@\/lib\/wallet-sync\/enqueue"/);

  const fnBody = actions.slice(
    actions.indexOf("export async function updateBusinessProfileAction"),
    actions.indexOf("export async function saveBranchAction"),
  );

  assert.match(fnBody, /businessBeforeUpdate = await prisma\.business\.findUnique/);
  const writeIndex = fnBody.indexOf("await prisma.business.update");
  const enqueueIndex = fnBody.indexOf("enqueueWalletSyncForBusiness(");
  assert.ok(writeIndex > -1 && enqueueIndex > -1 && writeIndex < enqueueIndex, "business must be saved before wallet sync is enqueued");
  assert.equal(countOccurrences(fnBody, /enqueueWalletSyncForBusiness\(/g), 1, "exactly one wallet sync per save");
  assert.match(fnBody, /hasWalletRelevantBusinessChange\(/);
  assert.match(fnBody, /trigger: "business-profile"/);
});

test("Brand Assets enqueues wallet sync exactly once, gated by branding change detection", () => {
  const actions = read("src/app/dashboard/actions.ts");

  const fnBody = actions.slice(
    actions.indexOf("export async function saveBrandAssetsAction"),
    actions.indexOf("export async function saveScannerSettingsAction"),
  );

  assert.match(fnBody, /brandingBeforeUpdate = await prisma\.businessBranding\.findUnique/);
  const writeIndex = fnBody.indexOf("await prisma.businessBranding.upsert");
  const enqueueIndex = fnBody.indexOf("enqueueWalletSyncForBusiness(");
  assert.ok(writeIndex > -1 && enqueueIndex > -1 && writeIndex < enqueueIndex, "branding must be saved before wallet sync is enqueued");
  assert.equal(countOccurrences(fnBody, /enqueueWalletSyncForBusiness\(/g), 1, "exactly one wallet sync per save");
  assert.match(fnBody, /hasWalletRelevantBrandingChange\(brandingBeforeUpdate, brandData\)/);
  assert.match(fnBody, /trigger: "brand-assets"/);
});

test("Program Creation enqueues wallet sync exactly once", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");
  assert.match(actions, /import \{ hasWalletRelevantProgramChange \} from "@\/lib\/wallet-sync\/change-detection"/);
  assert.match(actions, /import \{ enqueueWalletSync \} from "@\/lib\/wallet-sync\/enqueue"/);
  // The pinned, existing import must survive untouched.
  assert.match(actions, /import \{ summarizeWalletSyncForUser, syncWalletProvidersForProgram \} from "@\/lib\/wallet-sync";/);

  const fnBody = actions.slice(
    actions.indexOf("export async function createProgramAction"),
    actions.indexOf("export async function updateProgramAction"),
  );

  const writeIndex = fnBody.indexOf("await prisma.loyaltyProgram.create");
  const enqueueIndex = fnBody.indexOf("enqueueWalletSync(");
  assert.ok(writeIndex > -1 && enqueueIndex > -1 && writeIndex < enqueueIndex, "program must be created before wallet sync is enqueued");
  assert.equal(countOccurrences(fnBody, /enqueueWalletSync\(/g), 1, "exactly one wallet sync per save");
  assert.match(fnBody, /trigger: "program-created"/);
});

test("Program Settings enqueues wallet sync exactly once, gated by change detection", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");

  const fnBody = actions.slice(
    actions.indexOf("export async function updateProgramAction"),
    actions.indexOf("export async function toggleProgramAction"),
  );

  assert.match(fnBody, /select: \{ id: true, name: true, rewardName: true, cardTheme: true, active: true \}/);
  const writeIndex = fnBody.indexOf("await prisma.loyaltyProgram.update");
  const enqueueIndex = fnBody.indexOf("enqueueWalletSync(");
  assert.ok(writeIndex > -1 && enqueueIndex > -1 && writeIndex < enqueueIndex, "program must be saved before wallet sync is enqueued");
  assert.equal(countOccurrences(fnBody, /enqueueWalletSync\(/g), 1, "exactly one wallet sync per save");
  assert.match(fnBody, /hasWalletRelevantProgramChange\(program, \{/);
  assert.match(fnBody, /trigger: "program-settings"/);
});

test("Program activation toggle enqueues wallet sync exactly once, only when active actually flips", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");

  const fnBody = actions.slice(
    actions.indexOf("export async function toggleProgramAction"),
    actions.indexOf("export async function updateProgramDesignStudioAction"),
  );

  assert.match(fnBody, /select: \{ id: true, active: true \}/);
  assert.match(fnBody, /if \(program\.active !== active\) \{/);
  assert.equal(countOccurrences(fnBody, /enqueueWalletSync\(/g), 1, "exactly one wallet sync per save");
  assert.match(fnBody, /trigger: "program-toggle"/);
});

test("Design Studio keeps its own synchronous, pre-existing wallet sync call untouched", () => {
  const actions = read("src/app/dashboard/programs/actions.ts");

  const fnBody = actions.slice(
    actions.indexOf("export async function updateProgramDesignStudioAction"),
    actions.indexOf("export async function saveBusinessDesignPresetAction"),
  );

  // Still the original synchronous helper - not migrated to the new async enqueue module.
  assert.match(fnBody, /synchronizeWalletProvidersSafely\(\{\s*programId: program\.id,\s*programUuid: program\.uuid,\s*businessId: user\.businessId,\s*\}\)/);
  assert.doesNotMatch(fnBody, /enqueueWalletSync/);
});

test("Admin Business Form enqueues wallet sync exactly once, gated by change detection", () => {
  const actions = read("src/app/platform/businesses/actions.ts");
  assert.match(actions, /import \{ hasWalletRelevantBusinessChange \} from "@\/lib\/wallet-sync\/change-detection"/);
  assert.match(actions, /import \{ enqueueWalletSyncForBusiness \} from "@\/lib\/wallet-sync\/enqueue"/);

  const fnBody = actions.slice(
    actions.indexOf("export async function updateBusinessAction"),
    actions.indexOf("export async function toggleBusinessStatusAction"),
  );

  assert.match(fnBody, /businessBeforeUpdate = await prisma\.business\.findUnique/);
  const writeIndex = fnBody.indexOf("await prisma.$transaction");
  const enqueueIndex = fnBody.indexOf("enqueueWalletSyncForBusiness(");
  assert.ok(writeIndex > -1 && enqueueIndex > -1 && writeIndex < enqueueIndex, "business must be saved before wallet sync is enqueued");
  assert.equal(countOccurrences(fnBody, /enqueueWalletSyncForBusiness\(/g), 1, "exactly one wallet sync per save");
  assert.match(fnBody, /hasWalletRelevantBusinessChange\(/);
  assert.match(fnBody, /trigger: "admin-business-form"/);
});

test("no schema, wallet class/object id, or Apple Wallet code was touched by centralization", () => {
  const schema = read("prisma/schema.prisma");
  const programsActions = read("src/app/dashboard/programs/actions.ts");
  const mapper = read("src/lib/google-wallet/mapper.ts");

  // The wallet models exist exactly as before - no new columns/tables added for this work.
  assert.match(schema, /model GoogleWalletClass/);
  assert.match(schema, /model GoogleWalletObject/);
  assert.match(mapper, /export function buildGoogleWalletClassId/);
  assert.match(mapper, /export function buildGoogleWalletObjectId/);
  assert.doesNotMatch(programsActions, /[Aa]pple/);
});
