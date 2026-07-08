import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const exportRoutes = [
  "src/app/platform/audit-center/export/route.ts",
  "src/app/platform/billing-center/export/route.ts",
  "src/app/platform/tenant-center/export/route.ts",
  "src/app/platform/health-analytics/export/route.ts",
];

test("platform export routes require System Administrator access and support all launch formats", () => {
  for (const route of exportRoutes) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /requireRole\("PLATFORM_OWNER"\)/, `${route} should enforce platform owner access`);
    assert.match(source, /getExportFormat/, `${route} should validate export format`);
    assert.match(source, /exportResponse/, `${route} should return a real downloadable file`);
  }
});

test("platform export buttons point to real download routes instead of fake page query links", () => {
  const pageSources = [
    "src/app/platform/audit-center/page.tsx",
    "src/app/platform/billing-center/page.tsx",
    "src/app/platform/tenant-center/page.tsx",
    "src/app/platform/health-analytics/page.tsx",
  ].map((file) => readFileSync(file, "utf8"));

  for (const source of pageSources) {
    assert.doesNotMatch(source, /\?export=(csv|excel|pdf)/, "platform pages should not use visual-only export query links");
  }

  assert.match(pageSources.join("\n"), /\/platform\/audit-center\/export\?/, "audit center should link to export route");
  assert.match(pageSources.join("\n"), /\/platform\/billing-center\/export\?/, "billing center should link to export route");
  assert.match(pageSources.join("\n"), /\/platform\/tenant-center\/export\?/, "tenant center should link to export route");
  assert.match(pageSources.join("\n"), /\/platform\/health-analytics\/export\?/, "health analytics should link to export route");
});

test("shared export utility emits valid CSV, Excel, and PDF download responses", () => {
  const source = readFileSync("src/lib/export-files.ts", "utf8");
  assert.match(source, /text\/csv; charset=utf-8/);
  assert.match(source, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
  assert.match(source, /application\/pdf/);
  assert.match(source, /Content-Disposition/);
  assert.match(source, /\.csv/);
  assert.match(source, /\.xlsx/);
  assert.match(source, /\.pdf/);
});

test("System Administrator KPI cards navigate to supported investigation pages", () => {
  const platformDashboard = readFileSync("src/app/platform/page.tsx", "utf8");
  assert.match(platformDashboard, /href="\/platform\/businesses"/);
  assert.match(platformDashboard, /href="\/platform\/subscriptions\?status=ACTIVE"/);
  assert.match(platformDashboard, /href="\/platform\/billing-center"/);
  assert.match(platformDashboard, /href="\/platform\/audit-center\?eventType=Alert\+Actions"/);
  assert.match(platformDashboard, /href="\/platform\/tenant-center"/);
  assert.match(platformDashboard, /href="\/platform\/plans"/);

  const auditCenter = readFileSync("src/app/platform/audit-center/page.tsx", "utf8");
  assert.match(auditCenter, /href="\/platform\/audit-center\?date=today"/);
  assert.match(auditCenter, /href="\/platform\/audit-center\?eventType=Security\+Events"/);
  assert.match(auditCenter, /href="\/platform\/audit-center\?status=Failed"/);

  const billingCenter = readFileSync("src/app/platform/billing-center/page.tsx", "utf8");
  assert.match(billingCenter, /TrialManagement subscriptions=\{trialSubscriptions\}/);
  assert.match(billingCenter, /href="\/platform\/subscriptions\?expiry=next30"/);
  assert.match(billingCenter, /href="\/platform\/invoices\?status=OVERDUE"/);

  const tenantCenter = readFileSync("src/app/platform/tenant-center/page.tsx", "utf8");
  assert.match(tenantCenter, /href="\/platform\/tenant-center\?status=ACTIVE"/);
  assert.match(tenantCenter, /href="\/platform\/tenant-center\?status=TRIAL"/);
  assert.match(tenantCenter, /href="\/platform\/tenant-center\?status=SUSPENDED"/);
  assert.match(tenantCenter, /href="\/platform\/tenant-center\?status=EXPIRED"/);
});
