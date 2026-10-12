import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Stamps given and rewards redeemed per program, added up by the database.
 * The program pages used to load every stamp ever given just to sum them,
 * which grows with every visit; this stays one small query each.
 */
export async function getProgramActivityTotals(businessId: number) {
  const [stampRows, redemptionRows] = await Promise.all([
    prisma.$queryRaw<Array<{ program_id: number; stamps: bigint | number | null }>>`
      SELECT cpm."loyalty_program_id" AS program_id, SUM(st."quantity") AS stamps
      FROM "stamp_transactions" st
      JOIN "customer_program_memberships" cpm ON cpm."id" = st."customer_program_membership_id"
      WHERE st."business_id" = ${businessId}
      GROUP BY cpm."loyalty_program_id"`,
    prisma.rewardRedemption.groupBy({
      by: ["loyaltyProgramId"],
      where: { businessId },
      _count: { _all: true },
    }),
  ]);
  const stampsIssued = new Map<number, number>(stampRows.map((row) => [Number(row.program_id), Number(row.stamps ?? 0)]));
  const rewardsRedeemed = new Map<number, number>(redemptionRows.map((row) => [row.loyaltyProgramId, row._count._all]));
  return {
    stampsIssued: (programId: number) => stampsIssued.get(programId) ?? 0,
    rewardsRedeemed: (programId: number) => rewardsRedeemed.get(programId) ?? 0,
  };
}
