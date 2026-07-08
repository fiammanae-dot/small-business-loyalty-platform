import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

test("CSV export escapes formula-injection trigger characters", () => {
  const csv = read("src/lib/csv.ts");

  assert.match(csv, /FORMULA_TRIGGER\s*=\s*\/\^\[=\+\\-@\]\//, "csv.ts should define a formula-trigger regex covering =, +, -, and @");
  assert.match(csv, /export function sanitizeExportCell/);
  assert.match(csv, /sanitizeExportCell\(value === null \|\| value === undefined \? "" : String\(value\)\)/, "csvCell should sanitize every value before quoting");
});

test("Excel export reuses the same formula-injection sanitizer as CSV", () => {
  const exportFiles = read("src/lib/export-files.ts");

  assert.match(exportFiles, /import\s*\{[^}]*sanitizeExportCell[^}]*\}\s*from\s*"@\/lib\/csv"/, "export-files.ts should import sanitizeExportCell from the shared csv module");
  assert.match(exportFiles, /xmlEscape\(sanitizeExportCell\(String\(cell\)\)\)/, "XLSX cell writer should sanitize before XML-escaping");
});

test("every export route funnels through the shared, sanitized CSV/Excel writers", () => {
  const routes = [
    "src/app/dashboard/exports/[type]/route.ts",
    "src/app/platform/audit-center/export/route.ts",
    "src/app/platform/billing-center/export/route.ts",
    "src/app/platform/health-analytics/export/route.ts",
    "src/app/platform/tenant-center/export/route.ts",
  ];

  for (const route of routes) {
    const source = read(route);
    assert.ok(
      /toCsv\(/.test(source) || /exportResponse\(/.test(source),
      `${route} should build its download through the shared, sanitized toCsv/exportResponse helpers instead of hand-rolled CSV output`,
    );
  }
});
