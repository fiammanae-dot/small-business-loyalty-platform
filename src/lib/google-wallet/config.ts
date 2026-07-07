import "server-only";

import { requireConfiguredAppUrl } from "@/lib/app-url";

export type GoogleWalletConfig = {
  issuerId: string;
  serviceAccountEmail: string;
  privateKey: string;
  appUrl: string;
};

export function getGoogleWalletConfig(): GoogleWalletConfig | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!issuerId || !serviceAccountEmail || !privateKey) return null;

  return {
    issuerId,
    serviceAccountEmail,
    privateKey,
    appUrl: requireConfiguredAppUrl(),
  };
}

export function requireGoogleWalletConfig() {
  const config = getGoogleWalletConfig();
  if (!config) {
    throw new Error("Google Wallet is not configured. Set GOOGLE_WALLET_ISSUER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY.");
  }

  return config;
}

export function isGoogleWalletConfigured() {
  return Boolean(getGoogleWalletConfig());
}

function normalizePrivateKey(value?: string) {
  if (!value) return "";
  return value.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}
