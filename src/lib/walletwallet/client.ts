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
    const message =
      json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `HTTP ${res.status}`;
    throw new Error(`WalletWallet ${method} ${path} failed: ${message}`);
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
