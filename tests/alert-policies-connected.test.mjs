/**
 * Settings > Alert policies drive the real alert rules: threshold, level and
 * on/off are read by every detector, and new detectors cover scans, referrals,
 * rewards and cashback.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const engine = read("src/lib/alert-engine.ts");

const RULES = [
  "MULTI_STAMP_THRESHOLD",
  "REPEATED_STAMPS_SHORT_WINDOW",
  "CUSTOMER_DAILY_STAMP_LIMIT",
  "STAFF_DAILY_STAMP_LIMIT",
  "FAST_REWARD_PROGRESS",
  "HIGH_STAMP_UNDO_COUNT",
  "COOLDOWN_VIOLATION_THRESHOLD",
  "INVALID_SCAN_THRESHOLD",
  "WRONG_BUSINESS_SCAN_THRESHOLD",
  "REFERRAL_ABUSE_THRESHOLD",
  "HIGH_REWARD_ACTIVITY_THRESHOLD",
  "CASHBACK_LARGE_BILL",
  "CASHBACK_FREQUENT_EARN",
  "CASHBACK_LARGE_REDEMPTION",
];

test("every Settings rule is in the registry and seeded for every business", () => {
  const migration = read("prisma/migrations/0067_alert_policies_connected/migration.sql");
  for (const rule of RULES) {
    assert.match(engine, new RegExp(`ruleType: "${rule}"`), rule);
    assert.match(migration, new RegExp(`'${rule}'`), rule);
  }
  assert.match(migration, /ON CONFLICT \("business_id", "rule_type"\) DO NOTHING/);
});

test("a switched-off rule never creates an alert, and the owner's level wins", () => {
  assert.match(engine, /enabled: \(policy \? policy\.enabled : true\) && threshold > 0/);
  assert.match(engine, /if \(setting && !setting\.enabled\) return null;/);
  assert.match(engine, /const level = setting \? \(isStrongerVariant \? maxSeverity\(setting\.severity, severity\) : setting\.severity\) : severity;/);
});

test("every detector reads its threshold from the owner's policy", () => {
  const scan = read("src/app/scan/actions.ts");
  for (const rule of ["MULTI_STAMP_THRESHOLD", "REPEATED_STAMPS_SHORT_WINDOW", "CUSTOMER_DAILY_STAMP_LIMIT", "STAFF_DAILY_STAMP_LIMIT", "FAST_REWARD_PROGRESS", "HIGH_STAMP_UNDO_COUNT", "HIGH_REWARD_ACTIVITY_THRESHOLD"]) {
    assert.match(scan, new RegExp(`"${rule}"`), rule);
  }
  assert.doesNotMatch(scan, /customer24hTotal > 8\b/);
  assert.doesNotMatch(scan, /staff24hTotal > 50\b/);
  assert.match(read("src/lib/cooldowns.ts"), /getAlertRule\(tx, businessId, "COOLDOWN_VIOLATION_THRESHOLD"\)/);
  assert.match(engine, /"WRONG_BUSINESS_SCAN_THRESHOLD" : "INVALID_SCAN_THRESHOLD"/);
  assert.match(read("src/app/scan/[token]/page.tsx"), /await checkScanVolumeAlert\(/);
  assert.match(read("src/lib/referrals.ts"), /getAlertRule\(tx, businessId, "REFERRAL_ABUSE_THRESHOLD"\)/);
  const ledger = read("src/lib/cashback-ledger.ts");
  for (const rule of ["CASHBACK_LARGE_BILL", "CASHBACK_FREQUENT_EARN", "CASHBACK_LARGE_REDEMPTION"]) {
    assert.match(ledger, new RegExp(`"${rule}"`), rule);
  }
  // Referral payouts are not counted as bills.
  assert.match(ledger, /billAmount: \{ not: null \}/);
});

test("package alerts talk about visits, not stamps", () => {
  const scan = read("src/app/scan/actions.ts");
  assert.match(scan, /used the whole \$\{programName\} package within/);
  assert.match(read("src/lib/alert-labels.ts"), /FAST_REWARD_PROGRESS: "Card filled or package used unusually fast"/);
});

test("the alert list filter covers every alert type a rule produces", () => {
  assert.match(engine, /export function alertTypeFilterForRule/);
  assert.match(engine, /type\.endsWith\("_"\) \? \{ alertType: \{ startsWith: type \} \}/);
  assert.match(read("src/app/dashboard/notifications/page.tsx"), /\.\.\.\(ruleFilter \? \{ AND: \[ruleFilter\] \} : \{\}\)/);
});

test("risk number and level agree", () => {
  assert.match(engine, /LOW: 25, MEDIUM: 55, HIGH: 80, CRITICAL: 95/);
  assert.match(engine, /const effective = maxSeverity\(level, priorityFromRisk\(riskScore\)\);/);
});

test("owners are emailed about new high-risk alerts, after the response", () => {
  assert.match(engine, /notifyOwnersOfAlert/);
  assert.match(engine, /after\(/);
  const email = read("src/lib/alert-email.ts");
  assert.match(email, /role: "BUSINESS_OWNER"/);
  assert.match(email, /\/dashboard\/notifications\/\$\{/);
  assert.doesNotMatch(email, /RESEND_API_KEY\s*=\s*["']/);
});

test("the alert card does not clip its Actions menu", () => {
  const page = read("src/app/dashboard/notifications/page.tsx");
  assert.match(page, /<details className=\{`group min-w-0 rounded-xl border/);
  assert.doesNotMatch(page, /<details className=\{`group min-w-0 overflow-hidden/);
  assert.match(page, /absolute left-0 z-40 mt-2 w-72/);
});
