import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("design tokens define brand, semantic, spacing, focus, and breakpoint foundations", function () {
  const tokens = read("src/lib/design-tokens.ts");
  assert.match(tokens, /primary: "#F97316"/);
  assert.match(tokens, /dark: "#EA580C"/);
  assert.match(tokens, /success/);
  assert.match(tokens, /warning/);
  assert.match(tokens, /danger/);
  assert.match(tokens, /focusRing/);
  assert.match(tokens, /breakpoints/);
});

test("core button component exposes approved variants and accessible focus states", function () {
  const button = read("src/components/ui/Button.tsx");
  assert.match(button, /export type ButtonVariant/);
  for (const variant of ["primary", "secondary", "outline", "ghost", "danger", "success", "business"]) {
    assert.match(button, new RegExp(`${variant}:`));
  }
  assert.match(button, /focus-visible:ring-2/);
  assert.match(button, /disabled:pointer-events-none/);
});

test("status badge and metric card support shared variants without business logic", function () {
  const badge = read("src/components/ui/StatusBadge.tsx");
  const metric = read("src/components/ui/MetricCard.tsx");
  for (const tone of ["neutral", "success", "warning", "danger", "info", "brand", "business"]) {
    assert.match(badge, new RegExp(`${tone}`));
  }
  assert.match(metric, /href\?: string/);
  assert.match(metric, /cursor-pointer/);
  assert.doesNotMatch(metric, /prisma|requireRole|server action/i);
});

test("empty state and confirmation dialog include accessible labels", function () {
  const emptyState = read("src/components/ui/EmptyState.tsx");
  const dialog = read("src/components/ui/ConfirmationDialog.tsx");
  assert.match(emptyState, /title: ReactNode/);
  assert.match(emptyState, /description\?: ReactNode/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /aria-labelledby/);
  assert.match(dialog, /aria-describedby/);
  assert.match(dialog, /Cancel/);
  assert.match(dialog, /Confirm/);
});

test("domain UI components are props-only and do not expose raw UUID/debug data patterns", function () {
  const files = [
    "src/components/domain/CustomerSummaryCard.tsx",
    "src/components/domain/ProgramProgressCard.tsx",
    "src/components/domain/ScannerResultCard.tsx",
    "src/components/domain/CardQrTools.tsx",
  ];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /prisma|requireRole|process\.env|DATABASE_URL/);
    assert.doesNotMatch(source, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  }
});

test("layout foundations exist without migrating production pages", function () {
  const docs = read("docs/design-system/COMPONENT_LIBRARY.md");
  for (const file of [
    "DashboardPageLayout",
    "ManagementPageLayout",
    "DetailPageLayout",
    "ScannerPageLayout",
    "SettingsPageLayout",
    "PublicCardLayout",
  ]) {
    assert.ok(fs.existsSync(path.join(root, `src/components/layouts/${file}.tsx`)));
    assert.match(docs, new RegExp(file));
  }
});

test("design-system documentation exists for tokens, library, and usage guidance", function () {
  for (const file of [
    "docs/design-system/DESIGN_SYSTEM.md",
    "docs/design-system/COMPONENT_LIBRARY.md",
    "docs/design-system/USAGE_GUIDELINES.md",
  ]) {
    assert.ok(fs.existsSync(path.join(root, file)));
  }
});
