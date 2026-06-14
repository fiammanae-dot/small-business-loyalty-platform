import "server-only";

import type { ActivityAlert } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AlertActivityFields = Pick<
  ActivityAlert,
  "businessId" | "branchId" | "userId" | "customerProgramMembershipId" | "createdAt"
>;

export async function findRelatedStampTransaction(alert: AlertActivityFields) {
  if (!alert.customerProgramMembershipId) return null;

  const windowStart = new Date(alert.createdAt.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(alert.createdAt.getTime() + 5 * 60 * 1000);

  return prisma.stampTransaction.findFirst({
    where: {
      businessId: alert.businessId,
      customerProgramMembershipId: alert.customerProgramMembershipId,
      ...(alert.userId ? { issuedByUserId: alert.userId } : {}),
      ...(alert.branchId ? { branchId: alert.branchId } : {}),
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}

export function customerProfileHref(membershipUuid?: string | null, alertId?: number, transactionId?: number | null) {
  if (!membershipUuid) return null;

  const params = new URLSearchParams();
  if (alertId) params.set("alert", alertId.toString());
  if (transactionId) params.set("highlightTransaction", transactionId.toString());

  const query = params.toString();
  return `/dashboard/customers/${membershipUuid}${query ? `?${query}` : ""}#activity`;
}

export function staffProfileHref(staffUserId?: number | null, alertId?: number, transactionId?: number | null) {
  if (!staffUserId) return null;

  const params = new URLSearchParams();
  if (alertId) params.set("alert", alertId.toString());
  if (transactionId) params.set("highlightTransaction", transactionId.toString());

  const query = params.toString();
  return `/dashboard/staff/${staffUserId}${query ? `?${query}` : ""}`;
}

export function activityHref(transactionId?: number | null, alertId?: number) {
  if (!transactionId) return null;

  const params = new URLSearchParams();
  if (alertId) params.set("alert", alertId.toString());

  const query = params.toString();
  return `/dashboard/activity/${transactionId}${query ? `?${query}` : ""}`;
}
