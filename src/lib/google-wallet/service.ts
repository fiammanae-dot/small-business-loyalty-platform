import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createGoogleWalletApiClient } from "@/lib/google-wallet/client";
import { getGoogleWalletConfig, requireGoogleWalletConfig } from "@/lib/google-wallet/config";
import { buildSaveToGoogleWalletUrl, signSaveToGoogleWalletJwt } from "@/lib/google-wallet/jwt";
import {
  buildGoogleWalletAccountId,
  buildGoogleWalletClassId,
  buildGoogleWalletClassPayload,
  buildGoogleWalletObjectId,
  buildGoogleWalletObjectPayload,
  type GoogleWalletProgramMembership,
} from "@/lib/google-wallet/mapper";

type SyncResult =
  | { ok: true; objectId: string; classId: string; saveUrl?: string }
  | { ok: false; reason: "NOT_CONFIGURED" | "NOT_FOUND" | "SYNC_FAILED"; error: string };

const membershipInclude = {
  businessCustomerMembership: {
    include: {
      business: {
        include: {
          branding: true,
        },
      },
    },
  },
  loyaltyProgram: true,
} satisfies Prisma.CustomerProgramMembershipInclude;

export async function getGoogleWalletStatus(customerProgramMembershipId: number) {
  const walletObject = await prisma.googleWalletObject.findUnique({
    where: { customerProgramMembershipId },
    include: { googleWalletClass: true },
  });

  if (!walletObject) {
    return {
      configured: Boolean(getGoogleWalletConfig()),
      status: "NOT_CREATED" as const,
      objectId: null,
      classId: null,
      lastSyncedAt: null,
      lastError: null,
    };
  }

  return {
    configured: Boolean(getGoogleWalletConfig()),
    status: walletObject.status,
    objectId: walletObject.objectId,
    classId: walletObject.googleWalletClass.classId,
    lastSyncedAt: walletObject.lastSyncedAt,
    lastError: walletObject.lastError,
  };
}

export async function createGoogleWalletSaveLink(customerProgramMembershipId: number) {
  const config = requireGoogleWalletConfig();
  const result = await syncGoogleWalletObject(customerProgramMembershipId, { includeSaveUrl: true });
  if (!result.ok || !result.saveUrl) {
    throw new Error(result.ok ? "Unable to generate Google Wallet save link." : result.error);
  }

  await prisma.googleWalletObject.update({
    where: { objectId: result.objectId },
    data: { saveUrlLastGeneratedAt: new Date() },
  });

  return {
    saveUrl: result.saveUrl,
    issuerId: config.issuerId,
    objectId: result.objectId,
    classId: result.classId,
  };
}

export async function syncGoogleWalletObjectAfterLoyaltyChange(customerProgramMembershipId: number) {
  try {
    const result = await syncGoogleWalletObject(customerProgramMembershipId);
    if (!result.ok) {
      console.warn("[google-wallet] sync skipped or failed", result);
    }
  } catch (error) {
    console.warn("[google-wallet] sync failed after loyalty change", error);
  }
}

export type GoogleWalletClassSyncResult =
  | { ok: true; skipped: false; classId: string }
  | { ok: true; skipped: true; reason: "NOT_CONFIGURED" | "NO_EXISTING_CLASS" | "NO_MEMBERSHIP_CONTEXT" }
  | { ok: false; reason: "SYNC_FAILED"; error: string };

/**
 * Refreshes the shared Google Wallet Class for a program with the current
 * LoyaltyProgram.cardDesign. Google Wallet holds one Class per program and
 * every customer's Object references it, so patching the Class alone
 * refreshes the appearance for every existing pass without touching Objects.
 */
export async function syncGoogleWalletClassForProgram(loyaltyProgramId: number): Promise<GoogleWalletClassSyncResult> {
  const config = getGoogleWalletConfig();
  if (!config) {
    return { ok: true, skipped: true, reason: "NOT_CONFIGURED" };
  }

  const existingClass = await prisma.googleWalletClass.findUnique({
    where: { loyaltyProgramId },
  });
  if (!existingClass) {
    return { ok: true, skipped: true, reason: "NO_EXISTING_CLASS" };
  }

  const membership = await prisma.customerProgramMembership.findFirst({
    where: { loyaltyProgramId },
    include: membershipInclude,
  });
  if (!membership) {
    return { ok: true, skipped: true, reason: "NO_MEMBERSHIP_CONTEXT" };
  }

  const api = createGoogleWalletApiClient(config);

  try {
    await ensureGoogleWalletClass({
      api,
      config,
      membership: membership as GoogleWalletProgramMembership,
      classId: existingClass.classId,
      now: new Date(),
    });
    return { ok: true, skipped: false, classId: existingClass.classId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Wallet class sync failed.";
    await prisma.googleWalletClass
      .update({ where: { id: existingClass.id }, data: { status: "FAILED", lastError: message } })
      .catch(() => undefined);
    return { ok: false, reason: "SYNC_FAILED", error: message };
  }
}

export async function syncGoogleWalletObject(customerProgramMembershipId: number, options: { includeSaveUrl?: boolean } = {}): Promise<SyncResult> {
  const config = getGoogleWalletConfig();
  if (!config) {
    return { ok: false, reason: "NOT_CONFIGURED", error: "Google Wallet is not configured." };
  }

  const membership = await prisma.customerProgramMembership.findUnique({
    where: { id: customerProgramMembershipId },
    include: membershipInclude,
  });

  if (!membership) {
    return { ok: false, reason: "NOT_FOUND", error: "Customer program membership was not found." };
  }

  const typedMembership = membership as GoogleWalletProgramMembership;
  const api = createGoogleWalletApiClient(config);
  const now = new Date();
  const classId = buildGoogleWalletClassId(config.issuerId, typedMembership.loyaltyProgram.uuid);
  const objectId = buildGoogleWalletObjectId(config.issuerId, typedMembership.uuid);
  const accountId = buildGoogleWalletAccountId(typedMembership);

  try {
    const walletClass = await ensureGoogleWalletClass({
      api,
      config,
      membership: typedMembership,
      classId,
      now,
    });
    const objectPayload = await buildGoogleWalletObjectPayload({
      classId,
      objectId,
      accountId,
      membership: typedMembership,
    });
    const existingObject = await api.get("loyaltyObject", objectId);
    if (existingObject) {
      await api.patch("loyaltyObject", objectId, objectPayload);
    } else {
      await api.insert("loyaltyObject", objectPayload);
    }

    await prisma.googleWalletObject.upsert({
      where: { customerProgramMembershipId },
      update: {
        businessId: typedMembership.businessCustomerMembership.businessId,
        googleWalletClassId: walletClass.id,
        objectId,
        accountId,
        status: "ACTIVE",
        lastSyncedAt: now,
        lastError: null,
      },
      create: {
        businessId: typedMembership.businessCustomerMembership.businessId,
        googleWalletClassId: walletClass.id,
        customerProgramMembershipId,
        objectId,
        accountId,
        status: "ACTIVE",
        lastSyncedAt: now,
      },
    });

    const saveUrl = options.includeSaveUrl
      ? buildSaveToGoogleWalletUrl(signSaveToGoogleWalletJwt({ config, loyaltyObject: objectPayload }))
      : undefined;

    return { ok: true, objectId, classId, saveUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Wallet sync failed.";
    await markWalletSyncFailed({
      customerProgramMembershipId,
      businessId: typedMembership.businessCustomerMembership.businessId,
      classId,
      objectId,
      accountId,
      error: message,
    });
    return { ok: false, reason: "SYNC_FAILED", error: message };
  }
}

async function ensureGoogleWalletClass({
  api,
  config,
  membership,
  classId,
  now,
}: {
  api: ReturnType<typeof createGoogleWalletApiClient>;
  config: NonNullable<ReturnType<typeof getGoogleWalletConfig>>;
  membership: GoogleWalletProgramMembership;
  classId: string;
  now: Date;
}) {
  const classPayload = await buildGoogleWalletClassPayload({
    issuerId: config.issuerId,
    classId,
    membership,
    appUrl: config.appUrl,
  });

  const existing = await api.get("loyaltyClass", classId);
  if (existing) {
    await api.patch("loyaltyClass", classId, classPayload);
  } else {
    await api.insert("loyaltyClass", classPayload);
  }

  return prisma.googleWalletClass.upsert({
    where: { loyaltyProgramId: membership.loyaltyProgramId },
    update: {
      issuerId: config.issuerId,
      classId,
      businessId: membership.businessCustomerMembership.businessId,
      status: "ACTIVE",
      lastSyncedAt: now,
      lastError: null,
    },
    create: {
      issuerId: config.issuerId,
      classId,
      businessId: membership.businessCustomerMembership.businessId,
      loyaltyProgramId: membership.loyaltyProgramId,
      status: "ACTIVE",
      lastSyncedAt: now,
    },
  });
}

async function markWalletSyncFailed({
  customerProgramMembershipId,
  businessId,
  classId,
  objectId,
  accountId,
  error,
}: {
  customerProgramMembershipId: number;
  businessId: number;
  classId: string;
  objectId: string;
  accountId: string;
  error: string;
}) {
  const walletClass = await prisma.googleWalletClass.findFirst({
    where: { classId },
    select: { id: true },
  });
  if (!walletClass) return;

  await prisma.googleWalletObject.upsert({
    where: { customerProgramMembershipId },
    update: {
      status: "FAILED",
      objectId,
      accountId,
      lastError: error,
    },
    create: {
      businessId,
      googleWalletClassId: walletClass.id,
      customerProgramMembershipId,
      objectId,
      accountId,
      status: "FAILED",
      lastError: error,
    },
  });
}
