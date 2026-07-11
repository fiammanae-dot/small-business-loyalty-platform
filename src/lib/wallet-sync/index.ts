import "server-only";

import { logWalletSyncOutcome } from "@/lib/wallet-sync/logger";
import { googleWalletProvider } from "@/lib/wallet-sync/providers/google-wallet-provider";
import { getRegisteredProviders, registerProvider } from "@/lib/wallet-sync/registry";
import type { WalletProvider, WalletSyncContext, WalletSyncOutcome } from "@/lib/wallet-sync/types";

export type { WalletProvider, WalletSyncContext, WalletSyncOutcome };
export { registerProvider };

// Wallet providers register themselves here. Apple Wallet, Samsung Wallet, or
// any future provider is added the same way — one more registerProvider call,
// no changes to Design Studio or any other business logic.
registerProvider(googleWalletProvider);

/**
 * The single entry point that synchronizes every registered wallet provider
 * after a Program's card design is saved. Never throws: a provider failure
 * (or misconfiguration) is captured as a per-provider outcome so the caller
 * can log/report it without ever rolling back or failing the design save.
 */
export async function syncWalletProvidersForProgram(context: WalletSyncContext): Promise<WalletSyncOutcome[]> {
  const providers = getRegisteredProviders();
  const outcomes: WalletSyncOutcome[] = [];

  for (const provider of providers) {
    const startedAt = performance.now();
    const outcome = await runProviderSafely(provider, context);
    logWalletSyncOutcome(context, outcome, performance.now() - startedAt);
    outcomes.push(outcome);
  }

  return outcomes;
}

async function runProviderSafely(provider: WalletProvider, context: WalletSyncContext): Promise<WalletSyncOutcome> {
  try {
    return await provider.syncProgramCardDesign(context);
  } catch (error) {
    return {
      provider: provider.name,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown wallet synchronization error.",
    };
  }
}

/**
 * Turns wallet sync outcomes into a short, user-safe status line — no stack
 * traces or internal error details, just what happened per provider.
 */
export function summarizeWalletSyncForUser(outcomes: WalletSyncOutcome[]): string | null {
  if (outcomes.length === 0) return null;

  return outcomes
    .map((outcome) => {
      if (outcome.status === "synced") return `${outcome.provider} synchronized.`;
      if (outcome.status === "skipped") return `${outcome.provider} synchronization skipped (${outcome.reason}).`;
      return `${outcome.provider} synchronization failed. Check server logs.`;
    })
    .join(" ");
}
