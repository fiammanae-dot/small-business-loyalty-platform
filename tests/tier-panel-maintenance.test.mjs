import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

const tiersSource = read("src/lib/customer-tiers.ts");
const panelSource = read("src/components/public-card/TierStatusPanel.tsx");
const cardPageSource = read("src/app/card/[token]/page.tsx");

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
const { computeTierMaintenance, countQualifyingVisits } = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledTiers).toString("base64")}`
);

const now = new Date("2026-08-16T12:00:00.000Z");

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

function daysAfter(date, days) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

test("a Silver customer on exactly the threshold expires when the oldest qualifying visit ages out", () => {
  // Exactly the five visits Silver requires, all inside the 90-day window.
  const oldestQualifying = daysAgo(80);
  const visitEvents = [daysAgo(3), daysAgo(20), daysAgo(45), daysAgo(60), oldestQualifying];
  const summary = computeTierMaintenance({ visitEvents, config: dynamicConfig, tier: "Silver", now });

  assert.equal(summary.maintainThreshold, 5);
  assert.equal(summary.windowedVisits, 5);
  assert.equal(summary.isPermanent, false);
  assert.equal(
    summary.expiresAt?.toISOString(),
    daysAfter(oldestQualifying, 90).toISOString(),
    "status runs out when the fifth-most-recent visit leaves the window",
  );

  // The promised date is real: the requirement is still met on it, and no
  // longer met once it has passed.
  assert.equal(
    countQualifyingVisits(visitEvents, "DAYS_90", summary.expiresAt),
    5,
    "the customer still qualifies on the expiry date itself",
  );
  assert.ok(
    countQualifyingVisits(visitEvents, "DAYS_90", daysAfter(summary.expiresAt, 1)) < 5,
    "a day later the oldest visit has aged out and the tier no longer holds",
  );
});

test("extra visits push the expiry out to the newer visit that holds the tier up", () => {
  // Six visits: the fifth-most-recent is 60 days ago, not 80.
  const summary = computeTierMaintenance({
    visitEvents: [daysAgo(3), daysAgo(20), daysAgo(45), daysAgo(55), daysAgo(60), daysAgo(80)],
    config: dynamicConfig,
    tier: "Silver",
    now,
  });

  assert.equal(summary.windowedVisits, 6);
  assert.equal(summary.expiresAt?.toISOString(), daysAfter(daysAgo(60), 90).toISOString());
});

test("a Bronze customer has no requirement and no expiry", () => {
  const summary = computeTierMaintenance({
    visitEvents: [daysAgo(2), daysAgo(30)],
    config: dynamicConfig,
    tier: "Bronze",
    now,
  });

  assert.equal(summary.maintainThreshold, 0);
  assert.equal(summary.expiresAt, null);
  assert.equal(summary.windowedVisits, 2);
});

test("PERMANENT mode and a LIFETIME window are permanent and never expire", () => {
  const permanent = computeTierMaintenance({
    visitEvents: [daysAgo(5), daysAgo(10), daysAgo(15), daysAgo(20), daysAgo(25)],
    config: { ...dynamicConfig, tierMaintenanceMode: "PERMANENT" },
    tier: "Silver",
    now,
  });
  assert.equal(permanent.isPermanent, true);
  assert.equal(permanent.expiresAt, null);
  assert.equal(permanent.maintainThreshold, 5, "the requirement is still reported, it just cannot lapse");

  const lifetime = computeTierMaintenance({
    visitEvents: [daysAgo(500), daysAgo(400), daysAgo(300), daysAgo(200), daysAgo(100)],
    config: { ...dynamicConfig, tierQualificationWindow: "LIFETIME" },
    tier: "Silver",
    now,
  });
  assert.equal(lifetime.isPermanent, true);
  assert.equal(lifetime.expiresAt, null);
  assert.equal(lifetime.windowedVisits, 5, "a lifetime window counts every visit");
});

test("windowedVisits counts only visits inside the window", () => {
  const visitEvents = [daysAgo(1), daysAgo(89), daysAgo(91), daysAgo(200), daysAgo(400)];

  assert.equal(
    computeTierMaintenance({ visitEvents, config: dynamicConfig, tier: "Silver", now }).windowedVisits,
    2,
    "only the two visits inside 90 days qualify",
  );
  assert.equal(
    computeTierMaintenance({
      visitEvents,
      config: { ...dynamicConfig, tierQualificationWindow: "DAYS_30" },
      tier: "Silver",
      now,
    }).windowedVisits,
    1,
  );
  assert.equal(
    computeTierMaintenance({
      visitEvents,
      config: { ...dynamicConfig, tierQualificationWindow: "MONTHS_12" },
      tier: "Silver",
      now,
    }).windowedVisits,
    4,
  );
});

test("a customer already below the requirement gets no expiry date to promise", () => {
  const summary = computeTierMaintenance({
    // Silver on record, but only two visits still inside the window.
    visitEvents: [daysAgo(5), daysAgo(30), daysAgo(120), daysAgo(150), daysAgo(200)],
    config: dynamicConfig,
    tier: "Silver",
    now,
  });

  assert.equal(summary.windowedVisits, 2);
  assert.equal(summary.expiresAt, null, "the expiry is already in the past, so there is nothing to show");
});

test("the window length has one definition shared by the opening and expiry shifts", () => {
  // A duplicated 90 would let the two ends of the window drift apart.
  assert.match(tiersSource, /tierWindowOffsets/);
  assert.match(tiersSource, /shiftByTierWindow\(now, qualificationWindow, -1\)/);
  assert.match(tiersSource, /shiftByTierWindow\(tierHoldingVisit, qualificationWindow, 1\)/);
  assert.equal(tiersSource.match(/\bDAYS_90\b/g).length, 3, "DAYS_90 appears only in the label, default, and offset tables");
});

test("the panel renders maintain and upgrade states without fetching anything", () => {
  for (const prop of ["maintainThreshold", "windowedVisits", "expiresAt", "isPermanent", "windowLabel"]) {
    assert.match(panelSource, new RegExp(`${prop}\\??:`), `${prop} must be an accepted prop`);
    assert.match(cardPageSource, new RegExp(`${prop}=\\{`), `${prop} must be passed from the card page`);
  }

  assert.match(panelSource, /Status valid until \{validUntil\}/);
  assert.match(panelSource, /Permanent status/);
  assert.match(panelSource, /Maintain \{tierName\}/);
  assert.match(panelSource, /Upgrade to/);
  assert.match(panelSource, /Top tier member/, "the VIP state is preserved");
  assert.match(panelSource, /Customer tier/);
  assert.match(panelSource, /Exclusive Rewards Available/);
  assert.match(panelSource, /getTierTone/, "the existing tone styling is preserved");

  // Bronze shows neither a validity line nor a maintain card.
  assert.match(panelSource, /const hasTierToMaintain = maintainThreshold > 0/);
  assert.match(panelSource, /Math\.min\(windowedVisits, maintainThreshold\) \/ maintainThreshold/);

  // Purely presentational.
  assert.doesNotMatch(panelSource, /prisma|fetch\(|use server/, "the panel must not fetch data");
  assert.doesNotMatch(panelSource, /computeTierMaintenance/, "the maths stays in the library");
});

test("the card page feeds the panel from the tier data it already computed", () => {
  assert.match(cardPageSource, /computeTierMaintenance\(\{[\s\S]*?visitEvents: tierVisitDates/);
  assert.match(cardPageSource, /tier: tier\.tier/);
  assert.match(cardPageSource, /tierQualificationWindowLabels\[tier\.tierQualificationWindow\]/);
  assert.match(cardPageSource, /expiresAt=\{tierMaintenance\.expiresAt \? tierMaintenance\.expiresAt\.toISOString\(\) : null\}/);

  // The same visit list feeds both calls - no second query was added.
  assert.equal(cardPageSource.match(/stampTransaction\.findMany/g).length, 1);
  assert.match(cardPageSource, /visitEvents: tierVisitDates/);
});
