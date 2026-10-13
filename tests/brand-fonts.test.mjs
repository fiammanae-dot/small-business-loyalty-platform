/**
 * Brand typography: Comfortaa for headings and short lines, Nunito for body
 * text and app screens - served from the app (no Google Fonts request at
 * build or page load).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the brand fonts ship with the app, with their licences", () => {
  for (const file of ["src/app/fonts/Comfortaa-Variable.woff2", "src/app/fonts/Nunito-Variable.woff2", "src/app/fonts/Comfortaa-OFL.txt", "src/app/fonts/Nunito-OFL.txt"]) {
    assert.ok(existsSync(file), file);
  }
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /import localFont from "next\/font\/local";/);
  assert.doesNotMatch(layout, /next\/font\/google/);
  assert.match(layout, /variable: "--font-comfortaa"/);
  assert.match(layout, /variable: "--font-nunito"/);
  assert.match(layout, /className=\{`\$\{comfortaa\.variable\} \$\{nunito\.variable\} /);
});

test("body text is Nunito and headings are Comfortaa", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /--font-sans: var\(--font-nunito\)/);
  assert.match(css, /--font-display: var\(--font-comfortaa\)/);
  assert.match(css, /body \{[^}]*font-family: var\(--font-nunito\)/);
  // In the base layer, so a heading can still pick another font with a utility class.
  assert.match(css, /@layer base \{\s*h1,\s*h2,\s*h3 \{\s*font-family: var\(--font-display\);/);
  assert.doesNotMatch(css, /geist/i);
});
