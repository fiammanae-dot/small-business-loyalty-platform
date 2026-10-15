/**
 * Cashback gets its own detail page (like the other programs), reached by
 * clicking its name in the Programs list - not the create/edit wizard.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("the cashback detail page exists at /dashboard/programs/cashback", () => {
  const path = "src/app/dashboard/programs/cashback/page.tsx";
  assert.ok(existsSync(path), "cashback detail page file exists");
  const page = read(path);
  assert.match(page, /export default async function CashbackProgramDetailPage/);
  // live metrics and activity
  assert.match(page, /label="Members in cashback"/);
  assert.match(page, /label="Outstanding balance"/);
  assert.match(page, /Recent cashback activity/);
  assert.match(page, /prisma\.cashbackTransaction\.findMany/);
  // edit still routes to the wizard
  assert.match(page, /const EDIT_HREF = "\/dashboard\/programs\/new\?type=cashback"/);
});

test("the programs list links the cashback name to the detail page, not the wizard", () => {
  const page = read("src/app/dashboard/programs/page.tsx");
  // both the mobile card and the desktop table row name link to the detail page
  const matches = page.match(/href="\/dashboard\/programs\/cashback"/g) ?? [];
  assert.ok(matches.length >= 2, `expected >=2 name links to the detail page, found ${matches.length}`);
  // the explicit edit affordance still points to the wizard
  assert.match(page, /<ButtonLink href=\{editHref\} variant="outline">Edit cashback card<\/ButtonLink>/);
});

test("the cashback page columns are balanced: balance summary on the left, card design under the join QR", () => {
  const page = readFileSync("src/app/dashboard/programs/cashback/page.tsx", "utf8");
  assert.match(page, /className="grid gap-5 xl:grid-cols-\[1\.1fr_0\.9fr\] xl:items-start"/);
  const info = page.indexOf('title="Program Information"');
  const balance = page.indexOf('title="Balance summary"');
  const qr = page.indexOf('title="Program Join QR"');
  const design = page.indexOf('title="Card design"');
  assert.ok(info < balance && balance < qr && qr < design, "order: info, balance, QR, card design");
  assert.match(page, /title="Balance summary"[^]*?<div className="grid gap-3 md:grid-cols-3">/);
});
