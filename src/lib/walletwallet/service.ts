import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GoogleWalletProgramMembership } from "@/lib/google-wallet/mapper";
import { getWalletWalletConfig, isWalletWalletConfigured } from "./config";
import { createPass, updatePass, revokePass } from "./client";
import { buildWalletWalletPassBody } from "./mapper";

const membershipInclude = {
  businessCustomerMembership: {
    include: {
      business: {
        include: {
          branding: true,
          membershipSettings: true,
          cashbackSettings: true,
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

/**
 * Cashback shows on every one of a customer's passes, so a balance change
 * refreshes them all. Keyed by the customer (businessCustomerMembership), it
 * fans out to each active program membership's pass.
 */
export async function syncAppleWalletAfterCashbackChange(businessCustomerMembershipId: number): Promise<void> {
  if (!isWalletWalletConfigured()) return;
  const memberships = await prisma.customerProgramMembership.findMany({
    where: { businessCustomerMembershipId, status: "ACTIVE" },
    select: { id: true },
  });
  for (const membership of memberships) {
    await syncAppleWalletPassSafe(membership.id);
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
