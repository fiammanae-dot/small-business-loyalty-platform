import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("stamp journey foundation defines future Design Studio styles without persistence", () => {
  const design = read("src/lib/card-design.ts");
  const schema = read("prisma/schema.prisma");

  for (const style of ["CIRCLES", "CONNECTED_DOTS", "PROGRESS_BAR", "ICON_GRID", "ROADMAP", "TICKET_PUNCH"]) {
    assert.match(design, new RegExp(style));
  }

  assert.match(design, /export const stampJourneyStyles/);
  assert.match(design, /export function resolveStampJourneyStyle/);
  assert.match(design, /stampJourneyStyle: "CIRCLES"/);
  assert.match(design, /stampJourneyStyle: resolveStampJourneyStyle\(input\?\.stampJourneyStyle\)/);
  assert.doesNotMatch(schema, /stampJourneyStyle|stamp_journey_style|CardDesignStampJourneyStyle/);
});

test("stamp journey resolver keeps safe fallback behavior", () => {
  const design = read("src/lib/card-design.ts");

  assert.match(design, /if \(value === "progress-first"\) \{\s*return "CIRCLES";\s*\}/);
  assert.match(design, /return resolveValue\("stampJourneyStyle", value\)/);
});

test("stamp journey styles are not applied to live card renderers yet", () => {
  const wallet = read("src/components/public-card/LoyaltyWalletCard.tsx");
  const frontExport = read("src/components/public-card/LoyaltyCardFrontExport.tsx");
  const backExport = read("src/components/public-card/LoyaltyCardBackExport.tsx");
  const preview = read("src/components/CardThemePreviewSelector.tsx");
  const publicCard = read("src/app/card/[token]/page.tsx");

  for (const source of [wallet, frontExport, backExport, preview, publicCard]) {
    assert.doesNotMatch(source, /stampJourneyStyle|stampJourneyStyles|resolveStampJourneyStyle|CONNECTED_DOTS|ICON_GRID|ROADMAP|TICKET_PUNCH/);
  }
});
