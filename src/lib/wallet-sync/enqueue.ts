import "server-only";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncWalletProvidersForProgram } from "@/lib/wallet-sync";
import type { WalletSyncContext, WalletSyncOutcome } from "@/lib/wallet-sync/types";

export type WalletSyncTrigger =
  | "business-profile"
  | "brand-assets"
  | "admin-business-form"
  | "program-created"
  | "program-settings"
  | "program-toggle";

type EnqueueProgramContext = WalletSyncContext & { trigger: WalletSyncTrigger };

const RETRY_DELAY_MS = 4000;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function hasFailure(outcomes: WalletSyncOutcome[]) {
  return outcomes.some((outcome) => outcome.status === "failed");
}

/**
 * The single entry point every non-Design-Studio save flow uses to schedule a
 * wallet sync (Business Edit, Brand Assets, Admin Business Form, Program
 * Creation/Settings/activation toggle). Runs after the response has already
 * been sent (via `after`), so it never blocks page navigation, and retries
 * once on failure so a transient Google Wallet outage self-heals without the
 * business owner having to touch anything. Never throws.
 *
 * Design Studio intentionally keeps its own synchronous call in
 * programs/actions.ts - it has an existing, tested, user-facing sync summary
 * that moving off the request path would remove.
 */
export function enqueueWalletSync(context: EnqueueProgramContext): void {
  after(() => runWithRetry(context));
}

/**
 * Business-level changes (branding, business name) apply to every program the
 * business owns - each program has its own Google Wallet Class, so each one
 * genuinely needs its own sync call. Still exactly one enqueue per save: every
 * program's sync is scheduled inside the same `after()` callback.
 */
export function enqueueWalletSyncForBusiness(context: { businessId: number; trigger: WalletSyncTrigger }): void {
  after(async () => {
    const programs = await prisma.loyaltyProgram.findMany({
      where: { businessId: context.businessId },
      select: { id: true, uuid: true },
    });

    for (const program of programs) {
      await runWithRetry({
        programId: program.id,
        programUuid: program.uuid,
        businessId: context.businessId,
        trigger: context.trigger,
      });
    }
  });
}

async function runWithRetry(context: EnqueueProgramContext) {
  const logBase = {
    scope: "wallet-sync-trigger",
    trigger: context.trigger,
    businessId: context.businessId,
    programId: context.programId,
  };
  const startedAt = performance.now();
  console.log("[wallet-sync]", { ...logBase, event: "started" });

  try {
    const outcomes = await syncWalletProvidersForProgram(context);
    if (!hasFailure(outcomes)) {
      console.log("[wallet-sync]", { ...logBase, event: "completed", durationMs: Math.round(performance.now() - startedAt) });
      return;
    }

    console.warn("[wallet-sync]", { ...logBase, event: "retry_scheduled", delayMs: RETRY_DELAY_MS });
    await delay(RETRY_DELAY_MS);
    const retryOutcomes = await syncWalletProvidersForProgram(context);
    console.log("[wallet-sync]", {
      ...logBase,
      event: "completed",
      retried: true,
      failed: hasFailure(retryOutcomes),
      durationMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    // syncWalletProvidersForProgram never throws on its own (each provider runs
    // through its own safe wrapper), so reaching here means something failed
    // outside that boundary. Either way, this runs after the response has
    // already been sent, so the failure must never surface to the user.
    console.warn("[wallet-sync]", {
      ...logBase,
      event: "failed",
      error: error instanceof Error ? error.message : "Unknown wallet synchronization error.",
    });
  }
}
