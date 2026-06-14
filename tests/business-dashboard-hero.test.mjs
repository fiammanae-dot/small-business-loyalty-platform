import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("business dashboard hero uses approved display helpers for title and type", () => {
  const dashboard = read("src/app/dashboard/page.tsx");

  assert.match(dashboard, /getBusinessDisplayName\(business\.name\)/);
  assert.match(dashboard, /getBusinessTypeDisplayName\(businessTypeLabels\[business\.businessType\]\)/);
  assert.match(dashboard, /businessName=\{businessDisplayName\}/);
  assert.match(dashboard, /businessType=\{businessTypeDisplayName\}/);
  assert.doesNotMatch(dashboard, /businessName=\{business\.name\}/);
  assert.doesNotMatch(dashboard, /businessName=\{[^}]*(?:updatedAt|createdAt|id)[^}]*\}/);
  assert.doesNotMatch(dashboard, /businessType=\{[^}]*(?:updatedAt|createdAt|id)[^}]*\}/);
});

test("business display helper strips generated demo suffixes from hero names", () => {
  const helper = read("src/lib/business-display.ts");

  assert.match(helper, /GENERATED_NAME_SUFFIX/);
  assert.match(helper, /\\d\{10,\}/);
  assert.match(helper, /Updated/);
  assert.match(helper, /Unnamed Business/);
  assert.match(helper, /Business/);
});
