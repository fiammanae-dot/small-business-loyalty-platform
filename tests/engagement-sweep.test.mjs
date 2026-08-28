import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function read(path) {
  return readFileSync(path, "utf8");
}

const sweepSource = read("src/lib/engagement-sweep.ts");
const routeSource = read("src/app/api/cron/engagement-sweep/route.ts");
const engagementSource = read("src/lib/engagement.ts");

// CI runs `node --test` on Node 20, which cannot import .ts sources directly.
// Following the repo convention of testing the real source file, we read
// src/lib/engagement-sweep.ts, transpile it with the repo's existing TypeScript
// devDependency, and import the result as an in-memory ES module - so these
// behavioral tests exercise the actual sweep maths, not a copy. This only works
// because the module's single import is type-only and erased at transpile time.
assert.doesNotMatch(
  sweepSource,
  /^import (?!type )/m,
  "src/lib/engagement-sweep.ts must stay free of runtime imports (type-only imports allowed) so its behavioral tests can run on CI's Node 20",
);
const transpiled = ts.transpileModule(sweepSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { calendarYearBounds, daysBetween, decideInactivityBracket, inactivityEventTypes, inactivityRank, isBirthdayToday } =
  await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);

const DAY_IN_MS = 24 * 60 * 60 * 1000;

test("the inactivity bracket lands on the widest threshold the customer has passed", () => {
  assert.equal(decideInactivityBracket(29), null, "under 30 days is still an active customer");
  assert.equal(decideInactivityBracket(30), "INACTIVE_30_DAYS");
  assert.equal(decideInactivityBracket(59), "INACTIVE_30_DAYS");
  assert.equal(decideInactivityBracket(60), "INACTIVE_60_DAYS");
  assert.equal(decideInactivityBracket(89), "INACTIVE_60_DAYS");
  assert.equal(decideInactivityBracket(90), "INACTIVE_90_DAYS");
  assert.equal(decideInactivityBracket(200), "INACTIVE_90_DAYS", "the widest bracket is the ceiling");
});

test("a customer who has just visited falls into no bracket at all", () => {
  for (const days of [0, 1, 15, 29]) {
    assert.equal(decideInactivityBracket(days), null);
  }
  // A clock skew that dates activity in the future must not raise anything.
  assert.equal(decideInactivityBracket(-5), null);
  assert.equal(decideInactivityBracket(Number.NaN), null);
});

test("the brackets rank 30 < 60 < 90 so the sweep can supersede the ones below", () => {
  assert.ok(inactivityRank("INACTIVE_30_DAYS") < inactivityRank("INACTIVE_60_DAYS"));
  assert.ok(inactivityRank("INACTIVE_60_DAYS") < inactivityRank("INACTIVE_90_DAYS"));

  // What the route actually asks of the ranking: climbing to 90 supersedes both
  // lower brackets, and nothing supersedes the bracket a customer is in.
  const supersededBy = (bracket) =>
    inactivityEventTypes.filter((type) => inactivityRank(type) < inactivityRank(bracket));
  assert.deepEqual(supersededBy("INACTIVE_30_DAYS"), []);
  assert.deepEqual(supersededBy("INACTIVE_60_DAYS"), ["INACTIVE_30_DAYS"]);
  assert.deepEqual(supersededBy("INACTIVE_90_DAYS"), ["INACTIVE_30_DAYS", "INACTIVE_60_DAYS"]);

  // Event types outside the ladder are never ordered into it.
  assert.equal(inactivityRank("BIRTHDAY"), 0);
  assert.equal(inactivityRank("REWARD_REDEEMED"), 0);
});

test("days between two instants are whole days, not rounded ones", () => {
  const from = new Date("2026-05-01T00:00:00.000Z");

  assert.equal(daysBetween(from, new Date("2026-05-01T00:00:00.000Z")), 0);
  assert.equal(daysBetween(from, new Date("2026-05-01T23:59:59.999Z")), 0, "a partial day has not elapsed");
  assert.equal(daysBetween(from, new Date("2026-05-02T00:00:00.000Z")), 1);
  assert.equal(daysBetween(from, new Date("2026-05-31T12:00:00.000Z")), 30);
  assert.equal(daysBetween(from, new Date("2026-08-01T00:00:00.000Z")), 92);

  // Runs backwards rather than reporting a spurious lapse.
  assert.equal(daysBetween(new Date("2026-05-10T00:00:00.000Z"), from), -9);
  assert.equal(daysBetween(from, new Date(Number.NaN)), 0);
});

test("the sweep dates a lapsed customer from their last activity", () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const lastActivityAt = new Date(now.getTime() - 61 * DAY_IN_MS);

  assert.equal(decideInactivityBracket(daysBetween(lastActivityAt, now)), "INACTIVE_60_DAYS");
});

test("a birthday matches on the day, in the business timezone", () => {
  // Stored date-only at UTC midnight, the way parseBirthday writes it.
  const birthday = new Date("1990-08-28T00:00:00.000Z");

  assert.equal(isBirthdayToday(birthday, new Date("2026-08-28T03:00:00.000Z")), true);
  assert.equal(isBirthdayToday(birthday, new Date("2026-08-27T03:00:00.000Z")), false);
  assert.equal(isBirthdayToday(birthday, new Date("2026-08-29T03:00:00.000Z")), false);
  // Same month and day, any year.
  assert.equal(isBirthdayToday(birthday, new Date("2031-08-28T09:00:00.000Z")), true);
  // Same day number, wrong month.
  assert.equal(isBirthdayToday(new Date("1990-09-28T00:00:00.000Z"), new Date("2026-08-28T03:00:00.000Z")), false);
});

test("a customer with no birthday on file is never a birthday match", () => {
  const now = new Date("2026-08-28T03:00:00.000Z");

  assert.equal(isBirthdayToday(null, now), false);
  assert.equal(isBirthdayToday(undefined, now), false);
  assert.equal(isBirthdayToday(new Date(Number.NaN), now), false);
});

test("today is read in the business timezone, not the server's", () => {
  const birthday = new Date("1990-08-28T00:00:00.000Z");

  // 22:30 UTC on the 27th is already the 28th in Dubai (UTC+4).
  const eveningBefore = new Date("2026-08-27T22:30:00.000Z");
  assert.equal(isBirthdayToday(birthday, eveningBefore), true);
  assert.equal(isBirthdayToday(birthday, eveningBefore, "UTC"), false);
});

test("a 29 February birthday is handled, not crashed on", () => {
  const leapBirthday = new Date("1992-02-29T00:00:00.000Z");

  assert.equal(isBirthdayToday(leapBirthday, new Date("2028-02-29T03:00:00.000Z")), true);
  // No 29th to match in a common year - it simply does not fire.
  assert.equal(isBirthdayToday(leapBirthday, new Date("2026-02-28T03:00:00.000Z")), false);
  assert.equal(isBirthdayToday(leapBirthday, new Date("2026-03-01T03:00:00.000Z")), false);
});

test("the birthday year window covers exactly one calendar year", () => {
  const { start, end } = calendarYearBounds(new Date("2026-08-28T03:00:00.000Z"));

  assert.equal(start.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(end.toISOString(), "2027-01-01T00:00:00.000Z");

  // Next year's sweep looks at a different window, so the same customer can be
  // wished again - which the helper's ACTIVE-dedupe alone would never allow.
  const nextYear = calendarYearBounds(new Date("2027-08-28T03:00:00.000Z"));
  assert.equal(nextYear.start.toISOString(), "2027-01-01T00:00:00.000Z");
});

test("the cron route refuses to run unprotected and rejects a bad token", () => {
  assert.match(routeSource, /process\.env\.CRON_SECRET/);

  // An unset secret must never fall through to an open write endpoint.
  assert.match(
    routeSource,
    /if \(!secret\) \{[\s\S]*?console\.error\([\s\S]*?status: 500/,
    "a missing CRON_SECRET must log and respond 500",
  );
  assert.match(
    routeSource,
    /isAuthorized\(request\.headers\.get\("authorization"\), secret\)[\s\S]*?status: 401/,
    "a wrong or missing token must respond 401",
  );
  assert.match(routeSource, /timingSafeEqual/);
  assert.match(routeSource, /Bearer \$\{secret\}/, "Vercel Cron sends the secret as a Bearer token");
  assert.match(routeSource, /export const runtime = "nodejs"/, "timingSafeEqual needs the Node runtime");
  assert.match(routeSource, /export const dynamic = "force-dynamic"/);
});

test("the sweep is tenant-scoped, batched, and survives one bad customer", () => {
  // Archived tenants and departed customers are left out.
  assert.match(routeSource, /status: "ACTIVE", deletedAt: null/, "soft-deleted businesses are skipped");
  assert.match(routeSource, /where: \{ businessId, status: "ACTIVE" \}/, "only active customers are swept");

  // Every engagement event read and write leads with the tenant.
  const eventQueries = routeSource.match(/tx\.engagementEvent\.\w+\(\{/g) ?? [];
  const scopedEventQueries = routeSource.match(/tx\.engagementEvent\.\w+\(\{\s+(?:where|data): \{\s+businessId,/g) ?? [];
  assert.ok(eventQueries.length >= 3, "the sweep reads and writes engagement events");
  assert.equal(
    scopedEventQueries.length,
    eventQueries.length,
    "every engagement event query must be scoped by businessId",
  );

  // The nested activity lookups carry it too, rather than trusting the join.
  assert.match(routeSource, /stampTransactions: \{\s*where: \{ businessId \}/);
  assert.match(routeSource, /rewardRedemptions: \{\s*where: \{ businessId \}/);

  // Customers are paged, and only the newest activity row is loaded per program.
  assert.match(routeSource, /take: CUSTOMER_BATCH_SIZE/);
  assert.match(routeSource, /cursor: \{ id: cursor \}, skip: 1/);
  assert.match(routeSource, /orderBy: \{ createdAt: "desc" \},\s*take: 1/, "stamps are narrowed to the latest row");
  assert.match(routeSource, /orderBy: \{ redeemedAt: "desc" \},\s*take: 1/, "redemptions are narrowed to the latest row");

  // One customer's failure must not abort the run.
  assert.match(routeSource, /catch \(error\) \{[\s\S]*?errors\.push\(\{[\s\S]*?membershipId: customer\.id/);
  assert.match(
    routeSource,
    /\{ businessesProcessed, customersScanned, created, resolved, errorCount: errors\.length \}/,
  );
});

test("inactivity events supersede the brackets below and clear when a customer returns", () => {
  // Null bracket resolves the whole ladder; a bracket resolves only what it outranks.
  assert.match(
    routeSource,
    /const supersededTypes = bracket\s*\?\s*inactivityEventTypes\.filter\(\(type\) => inactivityRank\(type\) < inactivityRank\(bracket\)\)\s*:\s*inactivityEventTypes;/,
  );
  assert.match(routeSource, /data: \{ status: "RESOLVED" \}/);

  // The bracket event itself goes through the shared helper, so the marketing
  // consent gate and the ACTIVE-dedupe both still apply.
  assert.match(routeSource, /createEngagementEventIfAllowed\(\{[\s\S]*?eventType: bracket/);
  assert.match(routeSource, /metadata: \{ daysInactive, lastActivityAt: lastActivityAt\.toISOString\(\) \}/);
});

test("birthdays are gated on consent and raised at most once a calendar year", () => {
  assert.match(routeSource, /isBirthdayToday\(customer\.birthday, now\) && customer\.marketingConsent/);

  // The helper's ACTIVE-dedupe would block next year's birthday, so the yearly
  // window is checked directly instead.
  assert.match(routeSource, /eventType: "BIRTHDAY",\s*eventDate: \{ gte: start, lt: end \}/);
  assert.match(routeSource, /eventDate: now,\s*status: "ACTIVE",\s*metadata: \{ source: "engagement-sweep" \}/);
});

test("the sweep is scheduled daily and leaves the redemption path alone", () => {
  const vercelConfig = JSON.parse(read("vercel.json"));
  assert.deepEqual(vercelConfig.crons, [
    { path: "/api/cron/tier-recalc", schedule: "0 2 * * *" },
    { path: "/api/cron/engagement-sweep", schedule: "0 3 * * *" },
  ]);

  assert.match(read(".env.example"), /^CRON_SECRET=""$/m, "the example env carries a blank placeholder, never a secret");

  // REWARD_REDEEMED stays with the scan flow that performs the redemption.
  assert.match(read("src/app/scan/actions.ts"), /eventType: "REWARD_REDEEMED"/);
  assert.doesNotMatch(routeSource, /eventType: "REWARD_REDEEMED"/, "the sweep must not raise the redemption event");

  // The shared helper keeps the contract the sweep relies on.
  assert.match(engagementSource, /if \(isMarketingEngagement\(eventType\) && !customer\.marketingConsent\) return null;/);
  assert.match(engagementSource, /"BIRTHDAY",\s*"INACTIVE_30_DAYS",\s*"INACTIVE_60_DAYS",\s*"INACTIVE_90_DAYS",/);
});
