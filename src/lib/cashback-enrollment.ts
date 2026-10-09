import "server-only";

import type { Prisma } from "@prisma/client";
import QRCode from "qrcode";
import { logAuditEvent } from "@/lib/audit";
import { getBaseUrl } from "@/lib/customer-cards";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * Enrol a customer in the business's cashback program. Idempotent: a customer
 * who already joined keeps their original join date and nothing is logged twice.
 * Returns true when this call enrolled them.
 */
export async function enrollInCashback(input: {
  tx?: Tx;
  businessId: number;
  membershipId: number;
  actorUserId: number | null;
  branchId?: number | null;
  source: "OWNER" | "STAFF" | "SELF_SIGNUP";
}): Promise<boolean> {
  const db = input.tx ?? prisma;
  const updated = await db.businessCustomerMembership.updateMany({
    where: { id: input.membershipId, businessId: input.businessId, cashbackJoinedAt: null },
    data: { cashbackJoinedAt: new Date() },
  });
  if (updated.count === 0) return false;

  await logAuditEvent({
    tx: input.tx,
    actorUserId: input.actorUserId,
    businessId: input.businessId,
    branchId: input.branchId ?? null,
    action: "CASHBACK_JOINED",
    entityType: "business_customer_membership",
    entityId: input.membershipId,
    metadata: { source: input.source },
  });
  return true;
}

export async function getCashbackJoinUrl(token: string) {
  return `${await getBaseUrl()}/join/cashback/${token}`;
}

export async function getCashbackJoinQrDataUrl(token: string) {
  return QRCode.toDataURL(await getCashbackJoinUrl(token), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 260,
    color: { dark: "#111827", light: "#FFFFFF" },
  });
}
