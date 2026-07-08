import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

const form = () => read("src/components/ProgramDesignStudioForm.tsx");

test("wizard step indicator uses a fixed grid so step circles can never overlap", () => {
  const source = form();

  // grid-cols-5 gives each of the 5 steps an equal, non-overlapping column. The previous
  // flex/flex-1 layout was the source of the overlap regression.
  assert.match(source, /function WizardStepper/);
  assert.match(source, /<ol className="grid grid-cols-5/, "stepper must use CSS grid with a fixed column count, not flex-basis, to guarantee no overlap");
  assert.doesNotMatch(source, /<ol className="flex items-center gap-1 rounded-2xl border[^"]*"[^>]*aria-label="Design studio steps"/, "must not regress back to the flex layout that overlapped");
});

test("wizard step labels are always rendered (not hidden below a breakpoint) and use the short label set", () => {
  const source = form();

  assert.match(source, /wizardSteps: Array<\{ value: WizardStep; label: string \}> = \[/);
  assert.match(source, /label: "Start"/);
  assert.match(source, /label: "Style"/);
  assert.match(source, /label: "Rewards"/);
  assert.match(source, /label: "Content"/);
  assert.match(source, /label: "Review"/);
  // The regression was a `hidden ... sm:block` class combo that only showed labels above a
  // breakpoint, making the indicator look numeric-only on mobile. Labels must render always.
  assert.doesNotMatch(source, /className="hidden truncate text-\[11px\][^"]*sm:block"/, "step labels must not be conditionally hidden below sm breakpoint");
  assert.match(source, /className="w-full truncate text-\[10px\] font-bold text-\[#64748B\] data-\[active=true\]:text-\[#111827\] sm:text-\[11px\]"/);
});

test("wizard stepper tracks active and completed steps correctly", () => {
  const source = form();

  assert.match(source, /const active = current === step\.value/);
  assert.match(source, /const complete = current > step\.value/);
  assert.match(source, /aria-current=\{active \? "step" : undefined\}/);
  // completed steps show a checkmark and stay visibly styled instead of disappearing
  assert.match(source, /\{complete \? "✓" : step\.value\}/);
});

test("Phone, Apple Wallet, and Google Wallet each render visually distinct preview chrome", () => {
  const source = form();

  assert.match(source, /if \(context === "apple-wallet"\)/);
  assert.match(source, /if \(context === "google-wallet"\)/);
  assert.match(source, />Wallet<\/span>/, "Apple Wallet context must render its own distinguishing chrome, not just a background color");
  assert.match(source, />Pass<\/span>/);
  assert.match(source, />Google Wallet<\/span>/, "Google Wallet context must render its own distinguishing chrome");
  assert.match(source, />G<\/span>/);
  // The regression collapsed all three contexts into one shared frame that only swapped a
  // background color, so switching tabs looked like nothing happened.
  assert.doesNotMatch(source, /const previewFrameChrome: Record<PreviewContext, \{ background: string \}>/, "must not regress to the single shared background-only frame");
});

test("live preview is never height-clipped: no fixed/max-height + overflow-hidden combination wraps the card", () => {
  const source = form();

  // The regression was `max-h-[38vh] overflow-y-auto lg:max-h-[52vh]` wrapping the live
  // preview, which combined with `transform: scale(...)` clipped part of the card.
  assert.doesNotMatch(source, /max-h-\[38vh\] overflow-y-auto/, "must not reintroduce the clipping wrapper around the live preview");
  assert.doesNotMatch(source, /min-h-\[540px\]/, "must not reintroduce fixed-height wallet chrome that can clip tall card designs");
  assert.doesNotMatch(source, /h-\[520px\] overflow-hidden/, "must not reintroduce the fixed-height phone frame that can clip tall card designs");
  assert.match(source, /<div className="mt-2">\{livePreviewNode\}<\/div>/, "live preview must render at its natural height with no artificial cap");
});

test("zoom controls remain wired to the live preview scale", () => {
  const source = form();

  assert.match(source, /previewZoomScales\[previewZoom\]/);
  assert.match(source, /onClick=\{\(\) => setPreviewZoom\(previousPreviewZoom\(previewZoom\)\)\}/);
  assert.match(source, /onClick=\{\(\) => setPreviewZoom\(nextPreviewZoom\(previewZoom\)\)\}/);
  assert.match(source, /aria-label="Zoom out"/);
  assert.match(source, /aria-label="Zoom in"/);
});

test("Undo, Redo, Zoom, preview context tabs, and export actions live in one consolidated Preview section", () => {
  const source = form();

  const asideMatch = source.match(/<aside className="order-first[\s\S]*?<\/aside>/);
  assert.ok(asideMatch, "expected a single <aside> preview panel");
  const aside = asideMatch[0];

  // Exactly one bordered card should contain the whole preview toolkit, not three separate
  // floating cards as in the regression.
  const cardBorders = aside.match(/rounded-2xl border border-\[#E2E8F0\]/g) ?? [];
  assert.equal(cardBorders.length, 1, "Preview controls must live in exactly one cohesive card, not multiple separate floating cards");

  assert.match(aside, /Undo/);
  assert.match(aside, /Redo/);
  assert.match(aside, /aria-label="Zoom out"/);
  assert.match(aside, /aria-label="Preview context"/);
  assert.match(aside, /"PNG"/);
  assert.match(aside, /"PDF"/);
  assert.match(aside, /"Share"/);
  assert.match(aside, /onClick=\{downloadPreviewPng\}/);
  assert.match(aside, /onClick=\{downloadPreviewPdf\}/);
  assert.match(aside, /onClick=\{copyPreviewLink\}/);
});

test("preview context switch calls setPreviewContext for all three contexts", () => {
  const source = form();

  assert.match(source, /onClick=\{\(\) => setPreviewContext\(option\.value\)\}/);
  assert.match(source, /previewContextOptions\.map/);
});
