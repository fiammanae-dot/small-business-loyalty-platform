import "server-only";

import { headers } from "next/headers";

const APP_URL_ENV_KEYS = ["NEXT_PUBLIC_APP_URL", "APP_URL", "BASE_URL"] as const;

export function getConfiguredAppUrl() {
  for (const key of APP_URL_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      return normalizeBaseUrl(value);
    }
  }

  return null;
}

export function requireConfiguredAppUrl() {
  const configuredUrl = getConfiguredAppUrl();
  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL, APP_URL, or BASE_URL must be configured.");
  }

  return configuredUrl;
}

export async function getRequestBaseUrl() {
  const configuredUrl = getConfiguredAppUrl();
  if (configuredUrl) return configuredUrl;

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) {
    throw new Error("Unable to determine application URL. Configure NEXT_PUBLIC_APP_URL, APP_URL, or BASE_URL.");
  }

  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}
