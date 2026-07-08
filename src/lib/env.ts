import "server-only";

import { APP_URL_ENV_KEYS, getConfiguredAppUrl } from "@/lib/app-url";
import { isGoogleWalletConfigured } from "@/lib/google-wallet/config";

// Vars the platform cannot run without. Missing any of these in production means
// the server must not start (a booted server that can't sign sessions or reach
// its database is worse than no server at all).
const REQUIRED_ENV_KEYS = ["DATABASE_URL", "SESSION_SECRET"] as const;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function computeMissingRequiredEnv() {
  const missing: string[] = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]?.trim());

  if (!getConfiguredAppUrl()) {
    missing.push(`one of [${APP_URL_ENV_KEYS.join(", ")}]`);
  }

  return missing;
}

// Non-throwing status check for display purposes (e.g. the Platform Health page).
// Shares the same missing-variable detection as validateEnvironment() below so the
// two can never drift apart.
export function getEnvironmentStatus() {
  const missing = computeMissingRequiredEnv();
  return {
    ok: missing.length === 0,
    missing,
    googleWalletConfigured: isGoogleWalletConfigured(),
  };
}

export function validateEnvironment() {
  const missing = computeMissingRequiredEnv();

  if (missing.length > 0) {
    const message = `Missing required environment variable(s): ${missing.join(", ")}.`;
    if (isProduction()) {
      throw new Error(message);
    }
    console.error(`[env] ${message} The app will misbehave until this is fixed.`);
  }

  // Google Wallet is an optional integration (src/lib/google-wallet/config.ts already
  // degrades gracefully): warn so it's visible in logs, but never block startup.
  if (!isGoogleWalletConfigured()) {
    console.warn(
      "[env] Google Wallet is not configured (GOOGLE_WALLET_ISSUER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY). Wallet features will be disabled until configured.",
    );
  }
}
