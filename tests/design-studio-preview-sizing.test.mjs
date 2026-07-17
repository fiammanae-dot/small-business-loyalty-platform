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

test("the single mobile preview frame is full width, not a small fixed pixel cap", () => {
  const source = form();

  assert.match(source, /function MobileCardPreviewFrame/);
  assert.match(source, /<div className="w-full rounded-\[1\.6rem\] bg-\[#F1F5F9\] p-2 shadow-md">/, "preview frame must fill its container (w-full), not a narrow fixed-width box");
  assert.doesNotMatch(source, /max-w-\[220px\]/, "must not regress to the old, overly narrow fixed phone frame width");
  assert.doesNotMatch(source, /max-w-\[240px\]/, "must not regress to the old, overly narrow fixed wallet frame width");
  assert.doesNotMatch(source, /w-\[min\(100%,280px\)\]|w-\[min\(100%,300px\)\]/, "must not regress to a capped width now that there is only one full-width preview mode");
});

test("preview panel is only sticky on desktop, so a tall preview can't end up hidden behind the fixed mobile bottom nav", () => {
  const source = form();

  assert.match(source, /lg:sticky lg:top-20 lg:z-10/);
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

test("Design Studio keeps a single Mobile Card Preview mode - no Phone/Apple/Google switcher", () => {
  const source = form();

  assert.doesNotMatch(source, /apple-wallet|google-wallet/i, "wallet preview modes must be fully removed from Design Studio");
  assert.doesNotMatch(source, /setPreviewContext|previewContextOptions|type PreviewContext/, "the preview-context switching mechanism must be fully removed, not just hidden");
  assert.doesNotMatch(source, /aria-label="Preview context"/);
});

test("Undo, Redo, and Zoom stay in the main Preview panel since they work cleanly (not moved to an Advanced section)", () => {
  const source = form();

  assert.doesNotMatch(source, /Advanced Preview Controls/i, "undo/redo/zoom work cleanly, so they must stay in the main panel per the task's own condition");
  assert.match(source, /onClick=\{undoDesignChange\}/);
  assert.match(source, /onClick=\{redoDesignChange\}/);
});

test("the real Google Wallet integration is untouched - only the Design Studio preview UI changed", () => {
  // This is a UI-only simplification. The actual Google Wallet integration (issuer config,
  // JWT signing, wallet class/object sync) lives entirely outside this component and must
  // not be touched by removing the Design Studio's wallet *preview* tabs.
  const walletConfig = read("src/lib/google-wallet/config.ts");
  const walletMapper = read("src/lib/google-wallet/mapper.ts");

  assert.match(walletConfig, /getGoogleWalletConfig/);
  assert.match(walletConfig, /GOOGLE_WALLET_ISSUER_ID/);
  assert.match(walletMapper, /export/);
});
