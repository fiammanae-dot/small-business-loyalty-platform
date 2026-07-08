import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

const form = () => read("src/components/ProgramDesignStudioForm.tsx");

test("default zoom ('fit') renders the card at natural size, not artificially shrunk", () => {
  const source = form();

  // transform: scale() does not shrink the parent's layout box, so a default scale below 1
  // left symmetric dead space on both sides of the card - this was the root cause of the
  // "card looks too slim, large empty space on left/right" bug.
  assert.match(source, /fit:\s*1,/, "the default 'fit' zoom level must map to scale 1 (no shrink) so the card fills its frame by default");
  assert.doesNotMatch(source, /fit:\s*0\.82/, "must not regress to the old fit scale that created left/right dead space");
});

test("preview frames size responsively (min(100%, cap)) instead of a small fixed pixel width", () => {
  const source = form();

  assert.match(source, /w-\[min\(100%,280px\)\]/, "phone frame must use responsive min(100%, cap) sizing");
  assert.match(source, /w-\[min\(100%,300px\)\]/, "wallet frames must use responsive min(100%, cap) sizing");
  assert.doesNotMatch(source, /max-w-\[220px\]/, "must not regress to the old, overly narrow fixed phone frame width");
  assert.doesNotMatch(source, /max-w-\[240px\]/, "must not regress to the old, overly narrow fixed wallet frame width");
});

test("preview panel is only sticky on desktop, so a tall preview can't end up hidden behind the fixed mobile bottom nav", () => {
  const source = form();

  assert.match(source, /lg:sticky lg:top-6 lg:z-10/);
  assert.doesNotMatch(source, /className="sticky top-2 z-10/, "preview panel must not be unconditionally sticky - that let it grow tall on mobile and render behind the fixed bottom nav bar");
});

test("zoom controls remain wired after the sizing fix", () => {
  const source = form();

  assert.match(source, /previewZoomScales\[previewZoom\]/);
  assert.match(source, /aria-label="Zoom out"/);
  assert.match(source, /aria-label="Zoom in"/);
  assert.match(source, /previousPreviewZoom/);
  assert.match(source, /nextPreviewZoom/);
});

test("Phone, Apple Wallet, and Google Wallet context switching remains wired after the sizing fix", () => {
  const source = form();

  assert.match(source, /if \(context === "apple-wallet"\)/);
  assert.match(source, /if \(context === "google-wallet"\)/);
  assert.match(source, /onClick=\{\(\) => setPreviewContext\(option\.value\)\}/);
});
