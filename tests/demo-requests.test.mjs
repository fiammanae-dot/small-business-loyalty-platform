/**
 * The website's "Request Demo" form used to show a thank-you and drop the
 * details. Now every submission is saved, emailed to the sales inbox and
 * listed for the System Administrator on /platform/demo-requests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the form posts to a server action instead of pretending", () => {
  const form = read("src/components/DemoRequestForm.tsx");
  assert.match(form, /useActionState<DemoRequestState \| null, FormData>\(submitDemoRequestAction, null\)/);
  assert.match(form, /action=\{formAction\}/);
  assert.doesNotMatch(form, /event\.preventDefault\(\);\s*setSubmitted\(true\)/);
  // Honeypot for bots, and the error shown to people.
  assert.match(form, /name="website" tabIndex=\{-1\}/);
  assert.match(form, /role="alert"/);
});

test("a submission is saved first, then emailed, then rate limited per connection and email", () => {
  const action = read("src/app/request-demo/actions.ts");
  assert.match(action, /prisma\.demoRequest\.create\(/);
  assert.ok(action.indexOf("prisma.demoRequest.create(") < action.indexOf("sendDemoRequestEmail("), "save before email");
  assert.match(action, /isPublicActionRateLimited\(\{ scope, ipAddress, identifier: parsed\.data\.email, windowMinutes: 60, maxAttempts: 5 \}\)/);
  // A filled honeypot looks like success to the bot and stores nothing.
  assert.match(action, /if \(issue\?\.path\[0\] === "website"\) return \{ ok: true \};/);
  assert.match(read("src/lib/rate-limit.ts"), /"public_demo_request"/);
});

test("the email goes to the sales inbox with reply-to set to the requester", async () => {
  const lib = read("src/lib/demo-requests.ts");
  assert.match(lib, /DEMO_REQUEST_INBOX_FALLBACK = "admin@loyaltycarduae\.com"/);
  assert.match(lib, /process\.env\.DEMO_REQUEST_EMAIL/);
  assert.match(lib, /reply_to: request\.email/);
  assert.match(lib, /emailedAt: new Date\(\)/);
  // A mail failure is logged, never thrown: the lead is already saved.
  assert.match(lib, /return \{ delivered: false as const, reason: "provider_failed" \}/);
});

test("the administrator sees every request with status and note, and the page is admin-only", () => {
  const page = read("src/app/platform/demo-requests/page.tsx");
  assert.match(page, /requireRole\("PLATFORM_OWNER"\)/);
  assert.match(page, /prisma\.demoRequest\.findMany\(/);
  assert.match(page, /<form action=\{updateDemoRequestAction\}/);
  assert.match(page, /<CsrfInput scope="platform:demo-requests" \/>/);
  const actions = read("src/app/platform/demo-requests/actions.ts");
  assert.match(actions, /validateCsrfForm\(formData, "platform:demo-requests"\)/);
  assert.match(actions, /requireRole\("PLATFORM_OWNER"\)/);
  assert.match(actions, /action: "DEMO_REQUEST_UPDATED"/);
  assert.match(read("src/components/RoleNavigation.tsx"), /href: "\/platform\/demo-requests", label: "Demo requests"/);
});

test("the table and its migration exist", () => {
  assert.match(read("prisma/schema.prisma"), /model DemoRequest \{[\s\S]*@@map\("demo_requests"\)/);
  const migration = read("prisma/migrations/0071_demo_requests/migration.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "demo_requests"/);
  assert.match(migration, /CREATE TYPE "DemoRequestStatus" AS ENUM \('NEW', 'CONTACTED', 'WON', 'LOST'\)/);
});
