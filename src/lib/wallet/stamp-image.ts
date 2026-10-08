import { findStampIcon } from "@/lib/wallet/stamp-icons";

/**
 * Draws the row of stamps shown on a customer's wallet card.
 *
 * Google Wallet does not let an issuer lay a pass out; the logo, the card title
 * and the QR code sit where Google puts them. The one slot we control is the
 * hero image, so the stamps are drawn as a picture and dropped in there.
 *
 * The picture carries ONLY the stamps. The pass already states "3 / 10" and the
 * reward in Google's own fields, so repeating them here would duplicate the
 * wording and would force us to ship fonts to a serverless runtime.
 *
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

export function drawStampStripSvg(earned: number, total: number, emoji?: string | null): string {
  const safeTotal = Math.max(1, Math.min(30, Math.floor(total)));
  const safeEarned = Math.max(0, Math.min(safeTotal, Math.floor(earned)));
  const { body } = findStampIcon(emoji);

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
          `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size}" height="${size}" viewBox="0 0 36 36">${body}</svg>`,
        );
      } else {
        stamps.push(
          `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size}" height="${size}" viewBox="0 0 36 36" opacity="${REMAINING_OPACITY}">${body}</svg>`,
        );
      }
      placed += 1;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
${stamps.join("")}
</svg>`;
}

export async function drawStampStripPng(earned: number, total: number, emoji?: string | null): Promise<Buffer> {
  // Loaded here rather than at the top so the SVG and URL helpers - and their
  // tests - do not drag a native image library in behind them.
  const { default: sharp } = await import("sharp");
  return sharp(Buffer.from(drawStampStripSvg(earned, total, emoji)))
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * The address of a customer's stamp picture.
 *
 * Everything that changes the picture is in the path, so the URL is a safe
 * forever-cache key AND it changes the moment a stamp is added - which is what
 * makes Google fetch the new one instead of serving the old from its cache.
 */
// Bump when the drawing changes so the immutable, year-long cache (CDN, Apple
// and Google) is bypassed and every pass refetches the new picture. Hex-safe so
// it fits the route's slug pattern.
const STRIP_LAYOUT_VERSION = "a2";

export function stampImagePath(programUuid: string, earned: number, total: number, emoji?: string | null): string {
  const { emoji: resolved } = findStampIcon(emoji);
  const icon = [...resolved].map((ch) => ch.codePointAt(0)!.toString(16)).join("-");
  const tag = `${STRIP_LAYOUT_VERSION}-${icon}`;
  return `/api/wallet/stamps/${programUuid}/${earned}-of-${total}-${tag}.png`;
}
