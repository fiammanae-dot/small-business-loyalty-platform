import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

const tiersSource = read("src/lib/customer-tiers.ts");
const routeSource = read("src/app/api/cron/tier-recalc/route.ts");

// CI runs `node --test` on Node 20, which cannot import .ts sources directly.
// Following the repo convention of testing the real source file, we read
// src/lib/customer-tiers.ts, transpile it with the repo's existing TypeScript
// devDependency, and import the result as an in-memory ES module - so these
// behavioral tests exercise the actual tier maths, not a copy. This only works
// because the module's single import is type-only and erased at transpile time.
assert.doesNotMatch(
  tiersSource,
  /^import (?!type )/m,
  "src/lib/customer-tiers.ts must stay free of runtime imports (type-only imports allowed) so its behavioral tests can run on CI's Node 20",
);
const transpiledTiers = ts.transpileModule(tiersSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { decideTierMaintenance } = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledTiers).toString("base64")}`
);

const now = new Date("2026-08-13T12:00:00.000Z");

const dynamicConfig = {
  criteria: "VISITS_ONLY",
  tierQualificationWindow: "DAYS_90",
  tierMaintenanceMode: "DYNAMIC",
  silverVisitRequirement: 5,
  goldVisitRequirement: 15,
  vipVisitRequirement: 30,
};

function daysAgo(days) {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date;
}

function visitsAt(...dayOffsets) {
  return dayOffsets.map((offset) => daysAgo(offset));
}

test("a Silver customer whose visits aged out of the window is downgraded", () => {
  // Six lifetime visits, but only two land inside the 90-day window - below the
  // five the business requires for Silver.
  const decision = decideTierMaintenance({
    currentStoredTier: "SILVER",
    visitEvents: visitsAt(200, 190, 180, 170, 40, 10),
    config: dynamicConfig,
    now,
  });

  assert.deepEqual(decision, { nextStoredTier: "BRONZE", changed: true, downgraded: true });
});

test("a downgrade lands on the tier the customer still qualifies for, not straight to Bronze", () => {
  // Eight qualifying visits: short of Gold's fifteen, comfortably past Silver's five.
  const decision = decideTierMaintenance({
    currentStoredTier: "GOLD",
    visitEvents: visitsAt(80, 70, 60, 50, 40, 30, 20, 10),
    config: dynamicConfig,
    now,
  });

  assert.deepEqual(decision, { nextStoredTier: "SILVER", changed: true, downgraded: true });
});

test("a customer still meeting the requirement keeps their tier", () => {
  const decision = decideTierMaintenance({
    currentStoredTier: "SILVER",
    visitEvents: visitsAt(85, 60, 40, 20, 5),
    config: dynamicConfig,
    now,
  });

  assert.deepEqual(decision, { nextStoredTier: "SILVER", changed: false, downgraded: false });
});

test("the sweep never promotes - upgrades stay with the scan flow that notifies the customer", () => {
  const decision = decideTierMaintenance({
    currentStoredTier: "SILVER",
    visitEvents: visitsAt(...Array.from({ length: 40 }, (_, index) => index + 1)),
    config: dynamicConfig,
    now,
  });

  assert.deepEqual(decision, { nextStoredTier: "SILVER", changed: false, downgraded: false });
});

test("PERMANENT maintenance mode never downgrades, however stale the visits are", () => {
  const decision = decideTierMaintenance({
    currentStoredTier: "VIP",
    visitEvents: visitsAt(400, 380),
    config: { ...dynamicConfig, tierMaintenanceMode: "PERMANENT" },
    now,
  });

  assert.deepEqual(decision, { nextStoredTier: "VIP", changed: false, downgraded: false });
});

test("a LIFETIME qualification window never downgrades", () => {
  const decision = decideTierMaintenance({
    currentStoredTier: "GOLD",
    visitEvents: visitsAt(900, 800, 700),
    config: { ...dynamicConfig, tierQualificationWindow: "LIFETIME" },
    now,
  });

  assert.deepEqual(decision, { nextStoredTier: "GOLD", changed: false, downgraded: false });
});

test("a Bronze customer is left untouched - there is nothing below it", () => {
  for (const visitEvents of [[], visitsAt(300, 250)]) {
    assert.deepEqual(
      decideTierMaintenance({ currentStoredTier: "BRONZE", visitEvents, config: dynamicConfig, now }),
      { nextStoredTier: "BRONZE", changed: false, downgraded: false },
    );
  }
});

test("the decision accepts a pre-windowed visit count so the sweep can aggregate in SQL", () => {
  assert.deepEqual(
    decideTierMaintenance({ currentStoredTier: "SILVER", visits: 1, config: dynamicConfig, now }),
    { nextStoredTier: "BRONZE", changed: true, downgraded: true },
  );
  assert.deepEqual(
    decideTierMaintenance({ currentStoredTier: "SILVER", visits: 5, config: dynamicConfig, now }),
    { nextStoredTier: "SILVER", changed: false, downgraded: false },
  );
});

test("the cron route refuses to run unprotected and rejects a bad token", () => {
  assert.match(routeSource, /process\.env\.CRON_SECRET/);

  // An unset secret must never fall through to an open write endpoint.
  assert.match(routeSource, /if \(!secret\) \{[\s\S]*?console\.error\([\s\S]*?status: 500/, "a missing CRON_SECRET must log and respond 500");
  assert.match(routeSource, /isAuthorized\(request\.headers\.get\("authorization"\), secret\)[\s\S]*?status: 401/, "a wrong or missing token must respond 401");
  assert.match(routeSource, /timingSafeEqual/);
  assert.match(routeSource, /Bearer \$\{secret\}/, "Vercel Cron sends the secret as a Bearer token");
});

test("the sweep is scoped and batched instead of loading every customer's history", () => {
  assert.match(routeSource, /tierMaintenanceMode: "DYNAMIC"/);
  assert.match(routeSource, /tierQualificationWindow: \{ not: "LIFETIME" \}/);
  assert.match(routeSource, /currentTier: \{ not: "BRONZE" \}/);

  // Customers are paged, and visits are counted in the database.
  assert.match(routeSource, /take: CUSTOMER_BATCH_SIZE/);
  assert.match(routeSource, /cursor: \{ id: cursor \}, skip: 1/);
  assert.match(routeSource, /groupBy\(\{[\s\S]*?by: \["customerProgramMembershipId"\]/);
  assert.match(routeSource, /createdAt: \{ gte: windowStart, lte: now \}/, "visits are counted inside the qualification window");
  assert.doesNotMatch(routeSource, /stampTransaction\.findMany/, "the sweep must never load full stamp histories into memory");

  // One customer's failure must not abort the run.
  assert.match(routeSource, /catch \(error\) \{[\s\S]*?errors\.push\(\{[\s\S]*?membershipId: membership\.id/);
  assert.match(routeSource, /\{ businessesProcessed, customersChecked, downgraded, errors \}/);
});

test("the sweep only downgrades and stays silent", () => {
  assert.match(routeSource, /if \(!decision\.downgraded\) continue;/);
  assert.match(routeSource, /data: \{ currentTier: decision\.nextStoredTier, tierUpdatedAt: now \}/);
  assert.doesNotMatch(routeSource, /Notification|isTierUpgrade/, "this pass must not notify customers");
});

test("the sweep is scheduled daily and the scan flow is left alone", () => {
  const vercelConfig = JSON.parse(read("vercel.json"));
  assert.deepEqual(vercelConfig.crons, [{ path: "/api/cron/tier-recalc", schedule: "0 2 * * *" }]);

  assert.match(read(".env.example"), /^CRON_SECRET=""$/m, "the example env carries a blank placeholder, never a secret");

  // Additive only: scanning still recalculates and still notifies on upgrade.
  const scanActions = read("src/app/scan/actions.ts");
  assert.match(scanActions, /calculateCustomerTier\(\{/);
  assert.match(scanActions, /const upgradedTier = isTierUpgrade\(businessMembership\.currentTier, tier\.tier\)/);

  // Thresholds and window options are untouched.
  assert.match(tiersSource, /silverVisitRequirement: 5,\s*goldVisitRequirement: 15,\s*vipVisitRequirement: 30,/);
});
