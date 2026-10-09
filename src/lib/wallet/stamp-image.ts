import { findStampIcon } from "@/lib/wallet/stamp-icons";
import { drawStampStripSvg } from "@/lib/wallet/stamp-strip-svg";

export { drawStampStripSvg };

/**
 * The stamp strip as a PNG, for the wallets (Apple strip banner, Google hero
 * image). The drawing itself is in stamp-strip-svg.ts so the web card and the
 * design previews can draw exactly the same picture in the browser.
 */
export async function drawStampStripPng(earned: number, total: number, emoji?: string | null, customIconHref?: string | null): Promise<Buffer> {
  // Loaded here rather than at the top so the SVG and URL helpers - and their
  // tests - do not drag a native image library in behind them.
  const { default: sharp } = await import("sharp");
  return sharp(Buffer.from(drawStampStripSvg(earned, total, emoji, customIconHref)))
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
// a3: Google Noto artwork.
const STRIP_LAYOUT_VERSION = "a3";

/** A short, stable fingerprint of an uploaded icon's URL, for the cache key. */
function iconFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function stampImagePath(programUuid: string, earned: number, total: number, emoji?: string | null, customIconUrl?: string | null): string {
  const { emoji: resolved } = findStampIcon(emoji);
  // An uploaded icon changes the picture, so it changes the address too.
  const icon = customIconUrl ? `c${iconFingerprint(customIconUrl)}` : [...resolved].map((ch) => ch.codePointAt(0)!.toString(16)).join("-");
  const tag = `${STRIP_LAYOUT_VERSION}-${icon}`;
  return `/api/wallet/stamps/${programUuid}/${earned}-of-${total}-${tag}.png`;
}
