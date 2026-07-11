import "server-only";

import { syncGoogleWalletClassForProgram } from "@/lib/google-wallet/service";
import type { WalletProvider, WalletSyncContext, WalletSyncOutcome } from "@/lib/wallet-sync/types";

const skipReasons: Record<string, string> = {
  NOT_CONFIGURED: "not configured",
  NO_EXISTING_CLASS: "no wallet passes issued yet",
  NO_MEMBERSHIP_CONTEXT: "no enrolled customers",
};

export const googleWalletProvider: WalletProvider = {
  name: "Google Wallet",
  async syncProgramCardDesign(context: WalletSyncContext): Promise<WalletSyncOutcome> {
    const result = await syncGoogleWalletClassForProgram(context.programId);

    if (result.ok && !result.skipped) {
      return { provider: this.name, status: "synced", detail: `classId=${result.classId}` };
    }

    if (result.ok && result.skipped) {
      return { provider: this.name, status: "skipped", reason: skipReasons[result.reason] ?? result.reason };
    }

    return { provider: this.name, status: "failed", error: result.error };
  },
};
