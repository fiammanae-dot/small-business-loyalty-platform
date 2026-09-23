import type { GoogleWalletMessage } from "@/lib/google-wallet/client";

/**
 * Google Wallet broadcast logic, kept free of runtime imports (no Prisma, no
 * server-only, no Google auth) so node --test can exercise it directly. The
 * real wiring - config, database lookups and the API client - lives in
 * service.ts and is passed in as `deps`.
 *
 * Google Wallet holds one Class per loyalty program and every customer's
 * Object references it, so one addMessage on the Class reaches every customer
 * who has that program's card in Google Wallet. It costs nothing per message.
 */

export type WalletBroadcastMessage = { header: string; body: string };

export type GoogleWalletProgramBroadcastResult =
  | { ok: true; skipped: false; classId: string }
  | { ok: true; skipped: true; reason: "NOT_CONFIGURED" | "NO_EXISTING_CLASS" }
  | { ok: false; reason: "SYNC_FAILED"; error: string };

export type GoogleWalletBroadcastDeps<Config> = {
  /** Null when the Google Wallet env vars are not set. */
  getConfig: () => Config | null;
  /** The program's Google Wallet class id, or null if no customer has saved a card for it yet. */
  findClassId: (loyaltyProgramId: number) => Promise<string | null>;
  createClient: (config: Config) => {
    addMessage(resource: "loyaltyClass", id: string, message: GoogleWalletMessage): Promise<unknown>;
  };
  /** A fresh, unique message id per send. */
  newMessageId: () => string;
};

export type GoogleWalletBusinessBroadcastDeps<Config> = GoogleWalletBroadcastDeps<Config> & {
  listActiveProgramIds: (businessId: number) => Promise<number[]>;
};

export type GoogleWalletBusinessBroadcastResult = {
  /** Programs whose Google Wallet card holders received the message. */
  reached: number;
  /** Programs skipped (Google Wallet not configured, or no wallet card for that program yet). */
  skipped: number;
  /** Programs where Google rejected or the call failed. */
  failed: number;
  notConfigured: boolean;
  errors: string[];
  programs: Array<{ loyaltyProgramId: number; result: GoogleWalletProgramBroadcastResult }>;
};

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Google Wallet broadcast failed.";
}

/** Never throws: every outcome comes back as a result. */
export async function runGoogleWalletProgramBroadcast<Config>(
  deps: GoogleWalletBroadcastDeps<Config>,
  loyaltyProgramId: number,
  message: WalletBroadcastMessage,
): Promise<GoogleWalletProgramBroadcastResult> {
  try {
    const config = deps.getConfig();
    if (!config) return { ok: true, skipped: true, reason: "NOT_CONFIGURED" };

    const classId = await deps.findClassId(loyaltyProgramId);
    if (!classId) return { ok: true, skipped: true, reason: "NO_EXISTING_CLASS" };

    await deps.createClient(config).addMessage("loyaltyClass", classId, {
      id: deps.newMessageId(),
      header: message.header,
      body: message.body,
      // TEXT would only add the message to the back of the pass silently.
      // TEXT_AND_NOTIFY also pushes it to the phone, which is the point here.
      messageType: "TEXT_AND_NOTIFY",
    });
    return { ok: true, skipped: false, classId };
  } catch (error) {
    return { ok: false, reason: "SYNC_FAILED", error: errorMessage(error) };
  }
}

/** Sends to every active program of the business. Never throws. */
export async function runGoogleWalletBusinessBroadcast<Config>(
  deps: GoogleWalletBusinessBroadcastDeps<Config>,
  businessId: number,
  message: WalletBroadcastMessage,
): Promise<GoogleWalletBusinessBroadcastResult> {
  const summary: GoogleWalletBusinessBroadcastResult = {
    reached: 0,
    skipped: 0,
    failed: 0,
    notConfigured: false,
    errors: [],
    programs: [],
  };

  let programIds: number[];
  try {
    if (!deps.getConfig()) return { ...summary, notConfigured: true };
    programIds = await deps.listActiveProgramIds(businessId);
  } catch (error) {
    return { ...summary, failed: 1, errors: [errorMessage(error)] };
  }

  for (const loyaltyProgramId of programIds) {
    const result = await runGoogleWalletProgramBroadcast(deps, loyaltyProgramId, message);
    summary.programs.push({ loyaltyProgramId, result });
    if (!result.ok) {
      summary.failed += 1;
      summary.errors.push(result.error);
    } else if (result.skipped) {
      summary.skipped += 1;
      if (result.reason === "NOT_CONFIGURED") summary.notConfigured = true;
    } else {
      summary.reached += 1;
    }
  }

  return summary;
}
