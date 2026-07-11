import type { WalletSyncContext, WalletSyncOutcome } from "@/lib/wallet-sync/types";

export function logWalletSyncOutcome(context: WalletSyncContext, outcome: WalletSyncOutcome, durationMs: number) {
  const entry = {
    scope: "wallet-sync",
    programId: context.programId,
    programUuid: context.programUuid,
    businessId: context.businessId,
    provider: outcome.provider,
    status: outcome.status,
    durationMs: Math.round(durationMs),
    ...(outcome.status === "skipped" ? { reason: outcome.reason } : null),
    ...(outcome.status === "failed" ? { error: outcome.error } : null),
    ...(outcome.status === "synced" && outcome.detail ? { detail: outcome.detail } : null),
  };

  if (outcome.status === "failed") {
    console.warn("[wallet-sync]", entry);
  } else {
    console.log("[wallet-sync]", entry);
  }
}
