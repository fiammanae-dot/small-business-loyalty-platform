/**
 * Manual WhatsApp outreach: the owner and branch managers get a "to contact
 * today" list built from the nightly engagement events (birthday, quiet for
 * 30/60/90 days, reward ready...), one tap opens WhatsApp with the message
 * filled in and records the send, a customer then rests for the quiet period,
 * and only customers who agreed to marketing are ever listed. Promotions are
 * sent by hand to a segment the same way.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(path, "utf8");
const day = 24 * 60 * 60 * 1000;

test("the quiet rule rests a customer after any message", async () => {
  const { isQuiet, quietUntil, DEFAULT_QUIET_DAYS } = await loadTs("src/lib/outreach-rules.ts");
  const now = new Date("2026-10-16T10:00:00Z");
  assert.equal(DEFAULT_QUIET_DAYS, 14);
  assert.equal(isQuiet(null, now, 14), false);
  assert.equal(isQuiet(new Date(now.getTime() - 13 * day), now, 14), true);
  assert.equal(isQuiet(new Date(now.getTime() - 14 * day), now, 14), false);
  assert.equal(isQuiet(new Date(now.getTime() - 1 * day), now, 0), false);
  assert.equal(quietUntil(new Date("2026-10-01T00:00:00Z"), 14).toISOString(), "2026-10-15T00:00:00.000Z");
});

test("the WhatsApp link carries the message and only accepts UAE mobiles", async () => {
  const { whatsAppLink } = await loadTs("src/lib/outreach-rules.ts");
  assert.equal(whatsAppLink("050 123 4567", "Hi Sara & co"), "https://wa.me/971501234567?text=Hi%20Sara%20%26%20co");
  assert.equal(whatsAppLink("+971 55 765 4321", "x"), "https://wa.me/971557654321?text=x");
  assert.equal(whatsAppLink("00971501234567", "x"), "https://wa.me/971501234567?text=x");
  assert.equal(whatsAppLink("04 324 3337", "x"), null);
  assert.equal(whatsAppLink("+44 7700 900123", "x"), null);
});

test("events are ordered birthday first and the default set leaves out the noisy ones", async () => {
  const { eventPriority, DEFAULT_ENABLED_EVENTS, OUTREACH_EVENTS, eventLabel } = await loadTs("src/lib/outreach-rules.ts");
  assert.ok(eventPriority("BIRTHDAY") < eventPriority("REWARD_READY"));
  assert.ok(eventPriority("INACTIVE_90_DAYS") < eventPriority("INACTIVE_30_DAYS"));
  assert.ok(eventPriority("INACTIVE_30_DAYS") < eventPriority("NEAR_REWARD"));
  assert.deepEqual(DEFAULT_ENABLED_EVENTS, ["BIRTHDAY", "INACTIVE_30_DAYS", "INACTIVE_60_DAYS", "INACTIVE_90_DAYS", "REWARD_READY"]);
  assert.equal(OUTREACH_EVENTS.length, 8);
  assert.equal(eventLabel("INACTIVE_60_DAYS"), "Quiet for 60 days");
});

test("rules and promotion forms are validated", async () => {
  const { parseOutreachSettingsInput, parseCampaignInput, segmentWindow } = await loadTs("src/lib/outreach-rules.ts");
  assert.deepEqual(parseOutreachSettingsInput({ events: ["BIRTHDAY", "NOPE", "BIRTHDAY"], quietDays: "7" }), { ok: true, data: { enabledEvents: ["BIRTHDAY"], quietDays: 7 } });
  assert.deepEqual(parseOutreachSettingsInput({ events: [], quietDays: "" }).data, { enabledEvents: [], quietDays: 14 });
  assert.match(parseOutreachSettingsInput({ events: [], quietDays: "120" }).error, /0 to 90/);
  assert.match(parseOutreachSettingsInput({ events: [], quietDays: "2.5" }).error, /whole number/);

  assert.equal(parseCampaignInput({ name: "Eid offer", message: "Hi {{customer_name}}, 20% off this week.", segment: "VISITED_90" }).ok, true);
  assert.match(parseCampaignInput({ name: "E", message: "Hi there, 20% off this week.", segment: "ALL" }).error, /short name/);
  assert.match(parseCampaignInput({ name: "Eid", message: "short", segment: "ALL" }).error, /at least 10/);
  assert.match(parseCampaignInput({ name: "Eid", message: "Hi there, 20% off this week.", segment: "EVERYONE" }).error, /who should receive/);

  const now = new Date("2026-10-16T00:00:00Z");
  assert.equal(segmentWindow("VISITED_30", now).after.toISOString(), "2026-09-16T00:00:00.000Z");
  assert.equal(segmentWindow("QUIET_90", now).before.toISOString(), "2026-07-18T00:00:00.000Z");
  assert.deepEqual(segmentWindow("ALL", now), {});
});

test("the list only holds consenting, active customers with open events the business acts on", () => {
  const lib = read("src/lib/outreach.ts");
  const inbox = lib.slice(lib.indexOf("export async function getOutreachInbox"), lib.indexOf("export async function countOutreachInbox"));
  assert.match(inbox, /status: "ACTIVE",\s*eventType: \{ in: settings\.enabledEvents \},\s*outreachMessage: null,/);
  assert.match(inbox, /marketingConsent: true,/);
  assert.match(inbox, /createdBranchId: scope\.branchId/);
  assert.match(inbox, /isQuiet\(lastContact\.get\(primary\.customer\.id\), now, settings\.quietDays\)/);
  // Sending records the message and closes the event; skipping dismisses it.
  const record = lib.slice(lib.indexOf("export async function recordEventOutreach"));
  assert.match(record, /engagementEventId: event\.id,/);
  assert.match(record, /status: status === "SENT" \? "RESOLVED" : "DISMISSED"/);
  // Promotions never message a resting customer and only count consenting members.
  assert.match(lib, /AND m\.marketing_consent = TRUE/);
  assert.match(lib, /const quiet = !status && last && isQuiet\(last, now, settings\.quietDays\)/);
  assert.match(lib, /OR: \[\{ campaignId: null \}, \{ campaignId: \{ not: campaign\.id \} \}\]/);
});

test("the owner and branch managers can send; the schema logs every message", () => {
  const access = read("src/lib/outreach-access.ts");
  assert.match(access, /user\.role === "BUSINESS_OWNER"/);
  assert.match(access, /user\.role === "BRANCH_MANAGER" && user\.branchId/);
  const actions = read("src/app/dashboard/outreach/actions.ts");
  assert.match(actions, /validateCsrfForm\(formData, SCOPE\)/);
  assert.match(actions, /if \(who\.role !== "BUSINESS_OWNER"\) back\(who\.homePath, \{ error: "Only the business owner can change these rules\." \}\)/);
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model BusinessOutreachSettings \{/);
  assert.match(schema, /quietDays\s+Int\s+@default\(14\)/);
  assert.match(schema, /model OutreachMessage \{/);
  assert.match(schema, /engagementEventId Int\?\s+@unique/);
  assert.match(schema, /@@unique\(\[campaignId, membershipId\]\)/);
  const migration = read("prisma/migrations/0073_outreach/migration.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "outreach_messages"/);
  assert.match(migration, /"quiet_days" INTEGER NOT NULL DEFAULT 14/);
});

test("one tap opens WhatsApp and records the send; the pages exist for both roles", () => {
  const button = read("src/components/outreach/SendOnWhatsAppButton.tsx");
  assert.match(button, /window\.open\(link, "_blank", "noopener"\)/);
  assert.match(button, /type="submit"\s+name="status"\s+value="SENT"/);
  for (const page of ["src/app/dashboard/outreach/page.tsx", "src/app/branch/outreach/page.tsx"]) assert.match(read(page), /<OutreachInbox inbox=\{inbox\}/);
  assert.match(read("src/app/branch/outreach/page.tsx"), /getOutreachInbox\(\{ businessId, branchId: user\.branchId \}\)/);
  for (const page of ["src/app/dashboard/outreach/campaigns/[uuid]/page.tsx", "src/app/branch/outreach/campaigns/[uuid]/page.tsx"]) assert.match(read(page), /<CampaignChecklist campaign=\{campaign\}/);
  const nav = read("src/components/RoleNavigation.tsx");
  assert.match(nav, /href: "\/dashboard\/outreach", label: "WhatsApp outreach"/);
  assert.match(nav, /href: "\/branch\/outreach", label: "WhatsApp"/);
  assert.match(read("src/app/dashboard/page.tsx"), /to contact on WhatsApp today/);
  assert.match(read("src/app/branch/page.tsx"), /href="\/branch\/outreach"/);
});
