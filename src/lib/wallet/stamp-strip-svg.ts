/**
 * Draws the row of stamps shown on a customer's wallet card - the picture the
 * Apple strip banner and the Google hero image both show.
 *
 * Kept free of server-only imports so the web card and the design previews can
 * draw the very same picture in the browser (see WalletPassCard). The PNG
 * conversion for the wallets lives in stamp-image.ts.
 *
 * The picture carries ONLY the stamps. The pass already states "3 / 10" and the
 * reward in its own fields, so repeating them here would duplicate the wording.
 * The background is transparent so each business's card colour shows through.
 */

const WIDTH = 1032;
const MAX_PER_ROW = 6;
const MAX_ICON = 150;

/**
 * Stamps/visits still to earn are drawn as a faded copy of the same icon (not an
 * empty ring), so the card reads "x of y" at a glance and matches the in-app
 * card preview the business designs.
 */
const REMAINING_OPACITY = "0.3";

/** Ten stamps on one line would be too small to read, so wrap past six. */
function rowsFor(total: number): number[] {
  if (total <= MAX_PER_ROW) return [total];
  const half = Math.ceil(total / 2);
  return [half, total - half];
}

/** XML-escape a URL for an attribute. */
function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * @param iconHref The stamp icon picture, drawn once per slot. On the server
 *   it must be a data: URL (the wallet PNG renderer does not fetch); in the
 *   browser it can be an ordinary image URL.
 */
export function drawStampStripSvg(earned: number, total: number, iconHref: string | null | undefined): string {
  const safeTotal = Math.max(1, Math.min(30, Math.floor(total)));
  const safeEarned = Math.max(0, Math.min(safeTotal, Math.floor(earned)));
  // Each stamp is a nested <svg> box holding the icon picture scaled to fit.
  const content = `<image href="${escapeAttribute(iconHref ?? "")}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>`;
  const box = "0 0 100 100";

  const rows = rowsFor(safeTotal);
  const perRow = Math.max(...rows);
  // Leave a wide horizontal margin: Apple centre-crops the strip image to its
  // own banner ratio, so the stamps must sit well inside the edges to survive.
  const size = Math.min(MAX_ICON, Math.floor((WIDTH - 220) / (perRow * 1.45)));
  const gap = size * 1.45;
  const rowGap = size * 1.35;
  const blockHeight = rows.length * size + (rows.length - 1) * (rowGap - size);
  // Keep the whole picture no wider than ~2.4:1 so Apple's strip banner (which
  // is the taller variant when the pass has no primary field) shows every stamp
  // instead of cropping the outer ones. The stamps are centred in the height.
  const height = Math.max(Math.round(blockHeight + 120), Math.round(WIDTH / 2.4));
  const yStart = Math.round((height - blockHeight) / 2);

  let placed = 0;
  const stamps: string[] = [];
  rows.forEach((count, rowIndex) => {
    const y = yStart + rowIndex * rowGap;
    const startX = (WIDTH - ((count - 1) * gap + size)) / 2;
    for (let i = 0; i < count; i += 1) {
      const x = startX + i * gap;
      const earnedHere = placed < safeEarned;
      if (earnedHere) {
        stamps.push(
          `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size}" height="${size}" viewBox="${box}">${content}</svg>`,
        );
      } else {
        stamps.push(
          `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size}" height="${size}" viewBox="${box}" opacity="${REMAINING_OPACITY}">${content}</svg>`,
        );
      }
      placed += 1;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
${stamps.join("")}
</svg>`;
}

