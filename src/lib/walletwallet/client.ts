import "server-only";

import type { WalletWalletConfig } from "./config";

export type WalletWalletField = { label?: string; value: string; changeMessage?: string };
export type WalletWalletPassBody = Record<string, unknown>;

export type CreatePassResult = {
  serialNumber: string;
  googleSaveUrl?: string;
  applePass?: string;
  shareUrl: string;
};

export type UpdatePassResult = {
  serialNumber: string;
  lastUpdated?: number;
  notifiedDevices?: number;
  unchanged?: boolean;
};

async function request<T>(config: WalletWalletConfig, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    // Keep whatever the provider said (its "error", "message" or "details",
    // else the raw body), so the stored last error explains the refusal.
    const record = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    const said = [record.error, record.message, record.details]
      .map((value) => (typeof value === "string" ? value : value ? JSON.stringify(value) : ""))
      .filter(Boolean)
      .join(" - ");
    const message = said || (typeof record.raw === "string" && record.raw.trim()) || "";
    throw new Error(`WalletWallet ${method} ${path} failed (HTTP ${res.status})${message ? `: ${message.slice(0, 500)}` : ""}`);
  }
  return json as T;
}

export function createPass(config: WalletWalletConfig, body: WalletWalletPassBody) {
  return request<CreatePassResult>(config, "POST", "/api/passes", body);
}

export function updatePass(config: WalletWalletConfig, serial: string, body: WalletWalletPassBody) {
  return request<UpdatePassResult>(config, "PUT", `/api/passes/${encodeURIComponent(serial)}`, body);
}

export function revokePass(config: WalletWalletConfig, serial: string) {
  return request<{ serialNumber: string; deleted: boolean }>(config, "DELETE", `/api/passes/${encodeURIComponent(serial)}`);
}
