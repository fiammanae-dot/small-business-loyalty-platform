import "server-only";

import { JWT } from "google-auth-library";
import type { GoogleWalletConfig } from "@/lib/google-wallet/config";

const WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const WALLET_API_BASE = "https://walletobjects.googleapis.com/walletobjects/v1";

export type GoogleWalletResource = "loyaltyClass" | "loyaltyObject";

export type GoogleWalletApiClient = {
  get(resource: GoogleWalletResource, id: string): Promise<Record<string, unknown> | null>;
  insert(resource: GoogleWalletResource, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  patch(resource: GoogleWalletResource, id: string, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
};

export function createGoogleWalletApiClient(config: GoogleWalletConfig): GoogleWalletApiClient {
  const authClient = new JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: [WALLET_SCOPE],
  });

  async function request<T>({
    method,
    resource,
    id,
    body,
  }: {
    method: "GET" | "POST" | "PATCH";
    resource: GoogleWalletResource;
    id?: string;
    body?: Record<string, unknown>;
  }): Promise<T> {
    const rawHeaders = await authClient.getRequestHeaders();
    // google-auth-library v10 returns a Web `Headers` object. Spreading it with
    // `{ ...rawHeaders }` produces an empty object and drops the Authorization
    // token, making Google reject the request with a 401. Normalize to a plain
    // record so the spread below preserves the auth header. Older versions of the
    // library already returned a plain object, which this handles too.
    const headers: Record<string, string> =
      rawHeaders instanceof Headers ? Object.fromEntries(rawHeaders.entries()) : (rawHeaders as unknown as Record<string, string>);
    const response = await retry(async () => {
      const url = id ? `${WALLET_API_BASE}/${resource}/${encodeURIComponent(id)}` : `${WALLET_API_BASE}/${resource}`;
      return fetch(url, {
        method,
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    });

    const responseText = await response.text();
    const json = responseText ? safeJson(responseText) : null;
    if (!response.ok) {
      const message = extractGoogleError(json) ?? responseText ?? `Google Wallet API request failed with ${response.status}.`;
      throw new Error(message);
    }

    return (json ?? {}) as T;
  }

  return {
    async get(resource, id) {
      try {
        return await request<Record<string, unknown>>({ method: "GET", resource, id });
      } catch (error) {
        if (error instanceof Error && /404|not found/i.test(error.message)) return null;
        throw error;
      }
    },
    insert(resource, payload) {
      return request<Record<string, unknown>>({ method: "POST", resource, body: payload });
    },
    patch(resource, id, payload) {
      return request<Record<string, unknown>>({ method: "PATCH", resource, id, body: payload });
    },
  };
}

async function retry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
  throw lastError;
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractGoogleError(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const error = (value as { error?: { message?: unknown; code?: unknown } }).error;
  if (!error) return null;
  const code = typeof error.code === "number" || typeof error.code === "string" ? `${error.code}: ` : "";
  const message = typeof error.message === "string" ? error.message : null;
  return message ? `${code}${message}` : null;
}
