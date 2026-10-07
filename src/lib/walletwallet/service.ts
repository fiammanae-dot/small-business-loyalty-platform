import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GoogleWalletProgramMembership } from "@/lib/google-wallet/mapper";
import { getWalletWalletConfig, isWalletWalletConfigured } from "./config";
import { createPass, updatePass, revokePass } from "./client";
import { buildWalletWalletPassBody, buildCashbackPassBody, type FeaturePassCustomer } from "./mapper";

const membershipInclude = {
  businessCustomerMembership: {
    include: {
      business: {
        include: {
          branding: true,
          membershipSettings: true,
          cashbackSettings: true,
          tierSetting: true,
        },
      },
    },
  },
  loyaltyProgram: { include: { programRewards: { orderBy: { atStamp: "asc" } } } },
} satisfies Prisma.CustomerProgramMembershipInclude;

export type AppleWalletSyncResult =
  | { ok: true; serialNumber: string; shareUrl: string }
  | { ok: false; reason: "NOT_CONFIGURED" | "NOT_FOUND" | "SYNC_FAILED"; error?: string };

export async function getAppleWalletStatus(customerProgramMembershipId: number) {
  const pass = await prisma.appleWalletPass.findUnique({ where: { customerProgramMembershipId } });
  return {
    configured: isWalletWalletConfigured(),
    status: pass?.status ?? ("NOT_CREATED" as const),
    serialNumber: pass?.serialNumber ?? null,
    shareUrl: pass?.shareUrl ?? null,
    lastSyncedAt: pass?.lastSyncedAt ?? null,
    lastError: pass?.lastError ?? null,
  };
}

/**
 * Create the Apple pass the first time and PUT updates after that. Storing the
 * serial is what lets every later loyalty change push a live update to the
 * customer's phone (Apple via APNs, and Google at the same time).
 */
export async function syncAppleWalletPass(customerProgramMembershipId: number): Promise<AppleWalletSyncResult> {
  const config = getWalletWalletConfig();
  if (!config) return { ok: false, reason: "NOT_CONFIGURED" };

  const membership = await prisma.customerProgramMembership.findUnique({
    where: { id: customerProgramMembershipId },
    include: membershipInclude,
  });
  if (!membership) return { ok: false, reason: "NOT_FOUND" };

  const typed = membership as unknown as GoogleWalletProgramMembership;
  const businessId = typed.businessCustomerMembership.businessId;
  const existing = await prisma.appleWalletPass.findUnique({ where: { customerProgramMembershipId } });

  try {
    const body = await buildWalletWalletPassBody(typed);
    let serialNumber: string;
    let shareUrl: string;
    if (existing?.serialNumber) {
      await updatePass(config, existing.serialNumber, body);
      serialNumber = existing.serialNumber;
      shareUrl = existing.shareUrl ?? `${config.shareBaseUrl}/p/${serialNumber}`;
    } else {
      const created = await createPass(config, body);
      serialNumber = created.serialNumber;
      shareUrl = created.shareUrl ?? `${config.shareBaseUrl}/p/${serialNumber}`;
    }

    await prisma.appleWalletPass.upsert({
      where: { customerProgramMembershipId },
      update: { businessId, serialNumber, shareUrl, status: "ACTIVE", lastSyncedAt: new Date(), lastError: null },
      create: { businessId, customerProgramMembershipId, serialNumber, shareUrl, status: "ACTIVE", lastSyncedAt: new Date() },
    });
    return { ok: true, serialNumber, shareUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple Wallet sync failed.";
    await prisma.appleWalletPass.upsert({
      where: { customerProgramMembershipId },
      update: { businessId, status: "FAILED", lastError: message },
      create: { businessId, customerProgramMembershipId, serialNumber: existing?.serialNumber ?? null, status: "FAILED", lastError: message },
    });
    return { ok: false, reason: "SYNC_FAILED", error: message };
  }
}

/** Fire-and-forget: a wallet hiccup must never block the loyalty action. */
export async function syncAppleWalletPassSafe(customerProgramMembershipId: number): Promise<void> {
  try {
    await syncAppleWalletPass(customerProgramMembershipId);
  } catch {
    // swallowed on purpose - the pass will catch up on the next change
  }
}

// What a per-customer feature pass (cashback / tier) needs to render.
const featureCustomerInclude = {
  business: { include: { branding: true, cashbackSettings: true } },
} satisfies Prisma.BusinessCustomerMembershipInclude;

type FeatureKind = "CASHBACK";

/**
 * Create/PUT a per-customer feature card (cashback or tier). One pass per
 * customer per kind, keyed by (businessCustomerMembershipId, kind), holding the
 * WalletWallet serial so a later change pushes a live update.
 */
async function syncAppleFeaturePass(businessCustomerMembershipId: number, kind: FeatureKind): Promise<AppleWalletSyncResult> {
  const config = getWalletWalletConfig();
  if (!config) return { ok: false, reason: "NOT_CONFIGURED" };

  const customer = await prisma.businessCustomerMembership.findUnique({
    where: { id: businessCustomerMembershipId },
    include: featureCustomerInclude,
  });
  if (!customer) return { ok: false, reason: "NOT_FOUND" };

  const businessId = customer.businessId;
  const where = { businessCustomerMembershipId_kind: { businessCustomerMembershipId, kind } };
  const existing = await prisma.appleWalletFeaturePass.findUnique({ where });

  try {
    const typed = customer as unknown as FeaturePassCustomer;
    const body = await buildCashbackPassBody(typed);
    let serialNumber: string;
    let shareUrl: string;
    if (existing?.serialNumber) {
      await updatePass(config, existing.serialNumber, body);
      serialNumber = existing.serialNumber;
      shareUrl = existing.shareUrl ?? `${config.shareBaseUrl}/p/${serialNumber}`;
    } else {
      const created = await createPass(config, body);
      serialNumber = created.serialNumber;
      shareUrl = created.shareUrl ?? `${config.shareBaseUrl}/p/${serialNumber}`;
    }

    await prisma.appleWalletFeaturePass.upsert({
      where,
      update: { businessId, serialNumber, shareUrl, status: "ACTIVE", lastSyncedAt: new Date(), lastError: null },
      create: { businessId, businessCustomerMembershipId, kind, serialNumber, shareUrl, status: "ACTIVE", lastSyncedAt: new Date() },
    });
    return { ok: true, serialNumber, shareUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple Wallet feature card sync failed.";
    await prisma.appleWalletFeaturePass.upsert({
      where,
      update: { businessId, status: "FAILED", lastError: message },
      create: { businessId, businessCustomerMembershipId, kind, serialNumber: existing?.serialNumber ?? null, status: "FAILED", lastError: message },
    });
    return { ok: false, reason: "SYNC_FAILED", error: message };
  }
}

/** Create/PUT the per-customer CASHBACK card (used by the mint route). */
export async function syncAppleCashbackPass(businessCustomerMembershipId: number): Promise<AppleWalletSyncResult> {
  return syncAppleFeaturePass(businessCustomerMembershipId, "CASHBACK");
}

/**
 * Refresh a feature card ONLY if the customer already added it - a balance or
 * tier change updates an existing card, and never mints one nobody asked for.
 */
async function refreshAppleFeaturePassIfPresent(businessCustomerMembershipId: number, kind: FeatureKind): Promise<void> {
  if (!isWalletWalletConfigured()) return;
  try {
    const existing = await prisma.appleWalletFeaturePass.findUnique({
      where: { businessCustomerMembershipId_kind: { businessCustomerMembershipId, kind } },
      select: { id: true },
    });
    if (!existing) return;
    await syncAppleFeaturePass(businessCustomerMembershipId, kind);
  } catch {
    // swallowed on purpose - the card catches up on the next change
  }
}

/** A balance change refreshes the customer's cashback card, if they added one. */
export async function syncAppleWalletAfterCashbackChange(businessCustomerMembershipId: number): Promise<void> {
  await refreshAppleFeaturePassIfPresent(businessCustomerMembershipId, "CASHBACK");
}

/**
 * Re-sync every cashback card already added for a business. Used after the
 * owner edits the cashback program's design (name/theme/picture) so existing
 * cards pick up the new look, not just newly added ones. Update-only: it never
 * mints a card nobody added.
 */
export async function refreshBusinessCashbackPasses(businessId: number): Promise<void> {
  if (!isWalletWalletConfigured()) return;
  try {
    const passes = await prisma.appleWalletFeaturePass.findMany({
      where: { businessId, kind: "CASHBACK" },
      select: { businessCustomerMembershipId: true },
    });
    for (const pass of passes) {
      await syncAppleFeaturePass(pass.businessCustomerMembershipId, "CASHBACK");
    }
  } catch {
    // swallowed on purpose - cards catch up on the next change
  }
}

/** Tier rides on the stamp card, so a tier change refreshes the customer's
 *  existing program passes - it never mints a pass nobody added. */
export async function syncAppleWalletAfterTierChange(businessCustomerMembershipId: number): Promise<void> {
  if (!isWalletWalletConfigured()) return;
  try {
    const memberships = await prisma.customerProgramMembership.findMany({
      where: { businessCustomerMembershipId, appleWalletPass: { isNot: null } },
      select: { id: true },
    });
    for (const m of memberships) {
      await syncAppleWalletPassSafe(m.id);
    }
  } catch {
    // swallowed on purpose - the stamp card catches up on the next change
  }
}

export async function revokeAppleWalletPass(customerProgramMembershipId: number): Promise<void> {
  const config = getWalletWalletConfig();
  if (!config) return;
  const pass = await prisma.appleWalletPass.findUnique({ where: { customerProgramMembershipId } });
  if (!pass?.serialNumber) return;
  try {
    await revokePass(config, pass.serialNumber);
    await prisma.appleWalletPass.update({
      where: { customerProgramMembershipId },
      data: { status: "REVOKED", lastSyncedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple Wallet revoke failed.";
    await prisma.appleWalletPass.update({ where: { customerProgramMembershipId }, data: { lastError: message } });
  }
}
