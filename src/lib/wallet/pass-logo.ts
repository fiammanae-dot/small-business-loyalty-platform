import "server-only";

import { createHash } from "node:crypto";

/**
 * The brand logo as the wallets get it.
 *
 * Apple draws the pass logo inside a 160 x 50 pt box and Google crops it into a
 * small circle, so any empty margin baked into the uploaded picture makes the
 * logo look tiny. Instead of the raw upload, passes point at
 * /api/wallet/logo/<business>/<shape>.png, which trims that margin and sizes
 * the logo for each wallet:
 *   - "wide":   Apple - trimmed, kept in its own shape, fitted to 480 x 150 px (@3x).
 *   - "square": Google - trimmed and centred on a square with a small margin.
 * The ?v= part changes whenever the logo changes, so wallets fetch the new one.
 */

export type PassLogoShape = "wide" | "square";

export const PASS_LOGO_MAX_BYTES = 5 * 1024 * 1024;

function storageBase(): string | null {
  return process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") || null;
}

function absolute(url: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

/** Only logos the platform stored itself are fetched and re-processed (never an arbitrary address). */
export function isPlatformLogoUrl(url: string, baseUrl: string): boolean {
  const storage = storageBase();
  if (storage && url.startsWith(`${storage}/logos/`)) return true;
  return url.startsWith(`${baseUrl.replace(/\/+$/, "")}/uploads/logos/`);
}

/**
 * The trimmed logo URL for a pass, or null when the logo is not one the
 * platform stored (the caller then uses the logo as uploaded).
 */
export function passLogoUrl(input: { businessUuid: string; logoUrl: string | null | undefined; baseUrl: string; shape: PassLogoShape }): string | null {
  if (!input.logoUrl) return null;
  const source = absolute(input.logoUrl, input.baseUrl);
  if (!isPlatformLogoUrl(source, input.baseUrl)) return null;
  const version = createHash("sha256").update(source).digest("hex").slice(0, 12);
  return `${input.baseUrl.replace(/\/+$/, "")}/api/wallet/logo/${input.businessUuid}/${input.shape}.png?v=${version}`;
}

/** Trim the empty margin around a logo and size it for one wallet. */
export async function renderPassLogo(bytes: Buffer, shape: PassLogoShape): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  // Flatten SVGs / odd formats to RGBA first so trim and the corner check see pixels.
  const base = await sharp(bytes, { density: 300 }).ensureAlpha().png().toBuffer();
  let trimmed: Buffer;
  try {
    // trim() removes the border that matches the top-left pixel: transparent
    // padding, or a plain white (or any solid) frame around the mark.
    trimmed = await sharp(base).trim({ threshold: 12 }).png().toBuffer();
  } catch {
    trimmed = base; // a logo that is all one colour has nothing to trim
  }

  if (shape === "wide") {
    return sharp(trimmed).resize({ width: 480, height: 150, fit: "inside", withoutEnlargement: false }).png().toBuffer();
  }

  // Square for Google's circle: scale the mark so its corners (its diagonal)
  // sit inside the circle with a little margin - a wide wordmark is never
  // clipped - and centre it on the logo's own background (transparent or solid).
  const { data, info } = await sharp(trimmed).raw().toBuffer({ resolveWithObject: true });
  const corner = { r: data[0], g: data[1], b: data[2], alpha: data[3] / 255 };
  const background = corner.alpha < 0.5 ? { r: 0, g: 0, b: 0, alpha: 0 } : { ...corner, alpha: 1 };
  const SIZE = 660;
  const scale = (SIZE * 0.9) / Math.hypot(info.width, info.height);
  const width = Math.max(1, Math.round(info.width * scale));
  const height = Math.max(1, Math.round(info.height * scale));
  const mark = await sharp(trimmed).resize({ width, height, fit: "fill" }).png().toBuffer();
  const left = Math.floor((SIZE - width) / 2);
  const top = Math.floor((SIZE - height) / 2);
  return sharp(mark)
    .extend({ top, bottom: SIZE - height - top, left, right: SIZE - width - left, background })
    .png()
    .toBuffer();
}
