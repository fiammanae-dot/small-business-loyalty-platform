/**
 * iPhones zoom the page in when a form control with text under 16px gets
 * focus and stay zoomed, so after signing in the dashboard looked wider than
 * the screen. On touch screens every text control is at least 16px.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("form controls are at least 16px on touch screens", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /@media \(hover: none\) and \(pointer: coarse\) \{\s*input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="range"\]\),\s*select,\s*textarea \{\s*font-size: max\(16px, 1em\);/);
  // The viewport is the standard one: no maximum-scale tricks, people may still zoom on purpose.
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(layout, /width: "device-width",\s*initialScale: 1,/);
  assert.doesNotMatch(layout, /maximumScale|userScalable/);
});
