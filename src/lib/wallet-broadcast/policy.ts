import { evaluateBusinessScopedAccess, type PolicyUser } from "@/lib/authz-policy";
import type { GoogleWalletBusinessBroadcastResult, WalletBroadcastMessage } from "@/lib/google-wallet/broadcast";

/**
 * "Send a message to your Wallet customers" - the rules, kept free of server
 * imports so node --test can run them. The server action supplies the real
 * user, database and Google Wallet calls through `deps`.
 */

/** Google Wallet shows the header on one line; keep it short. */
export const WALLET_BROADCAST_HEADER_MAX = 30;
export const WALLET_BROADCAST_BODY_MAX = 1000;
/**
 * One broadcast per business every 12 hours. Google allows 3 notifying
 * messages per pass per 24 hours and throttles issuers it sees as spamming.
 */
export const WALLET_BROADCAST_COOLDOWN_MS = 12 * 60 * 60 * 1000;

/** Only broadcasts that actually reached someone start the cooldown. */
export const WALLET_BROADCAST_COOLDOWN_STATUSES = ["SENT", "PARTIAL"] as const;

export type WalletBroadcastStatusValue = "SENT" | "PARTIAL" | "SKIPPED" | "FAILED";

export type WalletBroadcastValidation =
  | { ok: true; message: WalletBroadcastMessage }
  | { ok: false; error: string };

export function validateWalletBroadcastInput(input: { header?: unknown; body?: unknown }): WalletBroadcastValidation {
  const header = typeof input.header === "string" ? input.header.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";

  if (!header) return { ok: false, error: "Add a headline." };
  if (!body) return { ok: false, error: "Add a message." };
  if (header.length > WALLET_BROADCAST_HEADER_MAX) {
    return { ok: false, error: `The headline can be at most ${WALLET_BROADCAST_HEADER_MAX} characters.` };
  }
  if (body.length > WALLET_BROADCAST_BODY_MAX) {
    return { ok: false, error: `The message can be at most ${WALLET_BROADCAST_BODY_MAX} characters.` };
  }
  return { ok: true, message: { header, body } };
}

export type WalletBroadcastCooldown = { active: false } | { active: true; availableAt: Date };

export function getWalletBroadcastCooldown(lastSentAt: Date | null, now: Date): WalletBroadcastCooldown {
  if (!lastSentAt) return { active: false };
  const availableAt = new Date(lastSentAt.getTime() + WALLET_BROADCAST_COOLDOWN_MS);
  return availableAt.getTime() > now.getTime() ? { active: true, availableAt } : { active: false };
}

export function walletBroadcastStatusFor(result: GoogleWalletBusinessBroadcastResult): WalletBroadcastStatusValue {
  if (result.reached > 0) return result.failed > 0 ? "PARTIAL" : "SENT";
  if (result.failed > 0) return "FAILED";
  return "SKIPPED";
}

export type WalletBroadcastRecord = {
  businessId: number;
  channel: "GOOGLE_WALLET";
  header: string;
  body: string;
  status: WalletBroadcastStatusValue;
  programsReached: number;
  programsSkipped: number;
  programsFailed: number;
  error: string | null;
  sentByUserId: number;
};

export type WalletBroadcastDeps = {
  getUser: () => Promise<(PolicyUser & { id: number }) | null>;
  /** When this business last sent a broadcast that reached someone (SENT or PARTIAL). */
  findLastCountedBroadcastAt: (businessId: number) => Promise<Date | null>;
  sendForBusiness: (businessId: number, message: WalletBroadcastMessage) => Promise<GoogleWalletBusinessBroadcastResult>;
  recordBroadcast: (record: WalletBroadcastRecord) => Promise<unknown>;
  now: () => Date;
};

export type WalletBroadcastOutcome =
  | { ok: true; status: "SENT" | "PARTIAL"; reached: number; skipped: number; failed: number }
  | {
      ok: false;
      code: "FORBIDDEN" | "INVALID" | "COOLDOWN" | "NOTHING_TO_SEND" | "FAILED";
      error: string;
      availableAt?: Date;
    };

/**
 * The whole send: owner check → input check → cooldown → Google Wallet →
 * history row. Every attempt that reaches the send step is recorded, whatever
 * happened, so the owner's history shows failures too.
 */
export async function runWalletBroadcast(
  deps: WalletBroadcastDeps,
  input: { header?: unknown; body?: unknown },
): Promise<WalletBroadcastOutcome> {
  const user = await deps.getUser();
  const access = evaluateBusinessScopedAccess(user, { roles: ["BUSINESS_OWNER"] });
  if (!access.ok || !user) {
    return { ok: false, code: "FORBIDDEN", error: "Only the business owner can send a message to Wallet customers." };
  }
  const businessId = access.businessId;

  const validation = validateWalletBroadcastInput(input);
  if (!validation.ok) return { ok: false, code: "INVALID", error: validation.error };

  const cooldown = getWalletBroadcastCooldown(await deps.findLastCountedBroadcastAt(businessId), deps.now());
  if (cooldown.active) {
    return {
      ok: false,
      code: "COOLDOWN",
      error: "You can send one Wallet message every 12 hours. Please try again later.",
      availableAt: cooldown.availableAt,
    };
  }

  const result = await deps.sendForBusiness(businessId, validation.message);
  const status = walletBroadcastStatusFor(result);

  await deps.recordBroadcast({
    businessId,
    channel: "GOOGLE_WALLET",
    header: validation.message.header,
    body: validation.message.body,
    status,
    programsReached: result.reached,
    programsSkipped: result.skipped,
    programsFailed: result.failed,
    error: result.errors.length ? result.errors.join(" | ").slice(0, 1000) : result.notConfigured ? "NOT_CONFIGURED" : null,
    sentByUserId: user.id,
  });

  // TODO: Apple Wallet broadcast (post-enrollment)

  if (status === "SENT" || status === "PARTIAL") {
    return { ok: true, status, reached: result.reached, skipped: result.skipped, failed: result.failed };
  }
  if (status === "FAILED") {
    return { ok: false, code: "FAILED", error: "Google Wallet did not accept the message. Please try again later." };
  }
  return {
    ok: false,
    code: "NOTHING_TO_SEND",
    error: result.notConfigured
      ? "Google Wallet is not set up yet, so there is no one to send to."
      : "None of your customers has added your card to Google Wallet yet.",
  };
}
