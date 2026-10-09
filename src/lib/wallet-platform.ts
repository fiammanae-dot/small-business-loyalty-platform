/**
 * Which wallet a customer's device can actually use.
 *
 * Apple Wallet only exists on iPhone/iPad and Google Wallet only on Android, so
 * offering both buttons lets a customer pick one their phone cannot open (an
 * iPhone sent to a Google sign-in page, an Android phone handed a .pkpass file
 * it cannot read). The card page shows only the matching button, and a QR code
 * on computers, where no wallet pass can live.
 */
export type WalletPlatform = "apple" | "google" | "desktop";

export function detectWalletPlatform(userAgent: string | null | undefined): WalletPlatform {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "apple";
  if (/Android/i.test(ua)) return "google";
  return "desktop";
}

/**
 * iPadOS Safari reports itself as a Mac, so the server sees "desktop". The
 * browser can tell the difference (a Mac has no touch screen); this runs there.
 */
export function refineWalletPlatformInBrowser(platform: WalletPlatform, userAgent: string, maxTouchPoints: number): WalletPlatform {
  if (platform === "desktop" && /Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "apple";
  return platform;
}
