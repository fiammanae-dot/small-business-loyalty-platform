import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditClient = Prisma.TransactionClient | typeof prisma;

export async function logAuditEvent({
  tx = prisma,
  actorUserId,
  businessId,
  branchId,
  action,
  entityType,
  entityId,
  metadata = {},
}: {
  tx?: AuditClient;
  actorUserId?: number | null;
  businessId?: number | null;
  branchId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await tx.auditEvent.create({
    data: {
      actorUserId: actorUserId ?? null,
      businessId: businessId ?? null,
      branchId: branchId ?? null,
      action,
      entityType,
      entityId: entityId === undefined || entityId === null ? null : String(entityId),
      metadata,
    },
  });
}
