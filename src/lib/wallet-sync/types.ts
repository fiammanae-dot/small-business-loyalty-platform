export type WalletSyncContext = {
  programId: number;
  programUuid: string;
  businessId: number;
};

export type WalletSyncOutcome =
  | { provider: string; status: "synced"; detail?: string }
  | { provider: string; status: "skipped"; reason: string }
  | { provider: string; status: "failed"; error: string };

export interface WalletProvider {
  readonly name: string;
  syncProgramCardDesign(context: WalletSyncContext): Promise<WalletSyncOutcome>;
}
