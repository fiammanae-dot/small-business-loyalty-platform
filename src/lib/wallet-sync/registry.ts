import "server-only";

import type { WalletProvider } from "@/lib/wallet-sync/types";

const providers: WalletProvider[] = [];

/**
 * Registers a wallet provider with the synchronization pipeline. Adding a new
 * wallet provider (e.g. Apple Wallet, Samsung Wallet) means calling this once
 * at module load — no Design Studio or business logic changes required.
 */
export function registerProvider(provider: WalletProvider) {
  if (providers.some((existing) => existing.name === provider.name)) return;
  providers.push(provider);
}

export function getRegisteredProviders(): readonly WalletProvider[] {
  return providers;
}
