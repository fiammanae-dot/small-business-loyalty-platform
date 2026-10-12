import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Client = Prisma.TransactionClient | typeof prisma;

export type PackageVisit = {
  id: number;
  createdAt: Date;
  membershipTreatmentId: number | null;
  treatmentName: string | null;
};

/**
 * The visits that really happened on a package: every stamp transaction for
 * the enrollment, minus the ones staff undid (stamp transactions are immutable,
 * so an undo is recorded as a STAMP_UNDONE audit event pointing at it).
 * `since` limits it to the current package term (the join or renewal date).
 */
export async function getPackageVisits(client: Client, customerProgramMembershipId: number, since?: Date): Promise<PackageVisit[]> {
  const [visits, undoEvents] = await Promise.all([
    client.stampTransaction.findMany({
      where: { customerProgramMembershipId, ...(since ? { createdAt: { gte: since } } : {}) },
      select: { id: true, createdAt: true, membershipTreatmentId: true, treatmentName: true },
      orderBy: { createdAt: "asc" },
    }),
    client.auditEvent.findMany({
      where: { action: "STAMP_UNDONE", entityType: "customer_program_membership", entityId: String(customerProgramMembershipId) },
      select: { metadata: true },
    }),
  ]);
  const undoneIds = new Set(
    undoEvents
      .map((event) => Number((event.metadata as { originalStampTransactionId?: unknown } | null)?.originalStampTransactionId))
      .filter((id) => Number.isFinite(id)),
  );
  return visits.filter((visit) => !undoneIds.has(visit.id));
}

/** Treatment keys already used: menu ids and lower-cased names (for "Other"). */
export function usedTreatmentKeys(visits: PackageVisit[]) {
  const ids = new Set<number>();
  const names = new Set<string>();
  for (const visit of visits) {
    if (visit.membershipTreatmentId) ids.add(visit.membershipTreatmentId);
    if (visit.treatmentName) names.add(visit.treatmentName.trim().toLowerCase());
  }
  return { ids, names };
}
