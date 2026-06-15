"use server";

import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function auditLoyaltyCardWhatsAppShare(membershipUuid: string) {
  const user = await getCurrentUser();
  if (!user || !["BUSINESS_OWNER", "BRANCH_MANAGER", "STAFF"].includes(user.role) || !user.businessId) {
    return { ok: false };
  }

  const membership = await prisma.businessCustomerMembership.findFirst({
    where: {
      uuid: membershipUuid,
      businessId: user.businessId,
    },
    select: {
      id: true,
      businessId: true,
      globalCustomerId: true,
      createdBranchId: true,
    },
  });

  if (!membership) return { ok: false };

  await logAuditEvent({
    actorUserId: user.id,
    businessId: membership.businessId,
    branchId: user.branchId ?? membership.createdBranchId,
    action: "LOYALTY_CARD_WHATSAPP_SHARE_CLICKED",
    entityType: "business_customer_membership",
    entityId: membership.id,
    metadata: {
      customerId: membership.globalCustomerId,
      userRole: user.role,
    },
  });

  return { ok: true };
}
