import "server-only";

export type WalletWalletConfig = {
  apiKey: string;
  baseUrl: string;
  shareBaseUrl: string;
};

/**
 * WalletWallet issues Apple Wallet (and Google) passes through one HTTP API.
 * The whole integration is gated on WALLETWALLET_API_KEY: with it unset the
 * feature is simply off, so the code ships safely before the key is in place.
 */
export function getWalletWalletConfig(): WalletWalletConfig | null {
  const apiKey = process.env.WALLETWALLET_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (process.env.WALLETWALLET_BASE_URL?.trim() || "https://api.walletwallet.dev").replace(/\/+$/, "");
  const shareBaseUrl = (process.env.WALLETWALLET_SHARE_BASE_URL?.trim() || "https://pass.walletwallet.dev").replace(/\/+$/, "");
  return { apiKey, baseUrl, shareBaseUrl };
}

export function isWalletWalletConfigured(): boolean {
  return Boolean(process.env.WALLETWALLET_API_KEY?.trim());
}
