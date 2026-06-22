import "server-only";

import { headers } from "next/headers";

const APP_URL_ENV_KEYS = ["NEXT_PUBLIC_APP_URL", "APP_URL", "BASE_URL"] as const;

export function getConfiguredAppUrl() {
  for (const key of APP_URL_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (!value) continue;

    const normalized = normalizeBaseUrl(value);
    if (isProductionRuntime() && isLocalOrPrivateBaseUrl(normalized)) {
      console.error(`${key} must not point to localhost or a private network address in production.`);
      continue;
    }

    return normalized;
  }

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const normalized = normalizeBaseUrl(vercelUrl);
    if (!isProductionRuntime() || !isLocalOrPrivateBaseUrl(normalized)) return normalized;
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

  const protocol = headerStore.get("x-forwarded-proto") ?? (isLocalOrPrivateHost(host) ? "http" : "https");
  const requestUrl = normalizeBaseUrl(`${protocol}://${host}`);
  if (isProductionRuntime() && isLocalOrPrivateBaseUrl(requestUrl)) {
    throw new Error("Production application URL resolved to localhost or a private network address. Configure NEXT_PUBLIC_APP_URL.");
  }

  return requestUrl;
}

function normalizeBaseUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function isLocalOrPrivateBaseUrl(value: string) {
  try {
    return isLocalOrPrivateHost(new URL(value).hostname);
  } catch {
    return true;
  }
}

function isLocalOrPrivateHost(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase();
  if (!hostname) return true;
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
}