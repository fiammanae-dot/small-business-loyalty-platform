import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { decideTierMaintenance, getTierWindowStart } from "@/lib/customer-tiers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily tier maintenance sweep.
 *
 * Tiers are recalculated on every scan, so a customer who stops visiting keeps
 * a tier they no longer qualify for until they show up again. This walks the
 * businesses that opted into dynamic, windowed tiers and lowers the stale ones.
 *
 * Downgrades only, and deliberately silent: upgrades and their customer
 * notifications remain the scan flow's job.
 */

// Customers are paged so a large business never loads its whole roster at once.
const CUSTOMER_BATCH_SIZE = 200;

type SweepError = {
  businessId: number;
  membershipId?: number;
  message: string;
};

function isAuthorized(header: string | null, secret: string) {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(header);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();

  // Fail closed: an unset secret would otherwise leave a write endpoint open.
  if (!secret) {
    console.error("Tier maintenance sweep refused to run: CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Cron secret is not configured." }, { status: 500 });
  }

  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const errors: SweepError[] = [];
  let businessesProcessed = 0;
  let customersChecked = 0;
  let downgraded = 0;

  // Only businesses that asked for tiers to expire: a permanent tier is never
  // revoked, and a lifetime visit count can never fall below a threshold.
  const tierSettings = await prisma.customerTierSetting.findMany({
    where: {
      tierMaintenanceMode: "DYNAMIC",
      tierQualificationWindow: { not: "LIFETIME" },
    },
    select: {
      businessId: true,
      criteria: true,
      tierQualificationWindow: true,
      tierMaintenanceMode: true,
      silverVisitRequirement: true,
      goldVisitRequirement: true,
      vipVisitRequirement: true,
    },
  });

  for (const setting of tierSettings) {
    const windowStart = getTierWindowStart(setting.tierQualificationWindow, now);
    if (!windowStart) continue;

    try {
      let cursor: number | undefined;

      for (;;) {
        // Bronze customers are already at the floor and cannot be downgraded.
        const memberships = await prisma.businessCustomerMembership.findMany({
          where: {
            businessId: setting.businessId,
            currentTier: { not: "BRONZE" },
          },
          select: { id: true, currentTier: true },
          orderBy: { id: "asc" },
          take: CUSTOMER_BATCH_SIZE,
          ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
        });

        if (memberships.length === 0) break;
        cursor = memberships[memberships.length - 1].id;

        const visitCounts = await countQualifyingVisitsForBatch({
          businessId: setting.businessId,
          membershipIds: memberships.map((membership) => membership.id),
          windowStart,
          now,
        });

        for (const membership of memberships) {
          customersChecked += 1;

          // One customer's failure must not cost the rest of the sweep.
          try {
            const decision = decideTierMaintenance({
              currentStoredTier: membership.currentTier,
              visits: visitCounts.get(membership.id) ?? 0,
              config: setting,
              now,
            });

            if (!decision.downgraded) continue;

            await prisma.businessCustomerMembership.update({
              where: { id: membership.id },
              data: { currentTier: decision.nextStoredTier, tierUpdatedAt: now },
            });
            downgraded += 1;
          } catch (error) {
            errors.push({
              businessId: setting.businessId,
              membershipId: membership.id,
              message: describeError(error),
            });
          }
        }

        if (memberships.length < CUSTOMER_BATCH_SIZE) break;
      }

      businessesProcessed += 1;
    } catch (error) {
      errors.push({ businessId: setting.businessId, message: describeError(error) });
    }
  }

  const summary = { businessesProcessed, customersChecked, downgraded, errors };
  console.info("Tier maintenance sweep completed.", {
    businessesProcessed,
    customersChecked,
    downgraded,
    errorCount: errors.length,
  });

  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Counts qualifying visits for a batch of customers with two windowed queries
 * instead of loading their stamp histories.
 *
 * A visit is one stamp transaction, matching how the scan flow feeds
 * calculateCustomerTier - it counts rows, not stamp quantities. Customers can
 * hold several program memberships in one business, so counts are grouped by
 * program membership and then summed back per customer.
 */
async function countQualifyingVisitsForBatch({
  businessId,
  membershipIds,
  windowStart,
  now,
}: {
  businessId: number;
  membershipIds: number[];
  windowStart: Date;
  now: Date;
}) {
  const visitCounts = new Map<number, number>();
  if (membershipIds.length === 0) return visitCounts;

  const programMemberships = await prisma.customerProgramMembership.findMany({
    where: { businessCustomerMembershipId: { in: membershipIds } },
    select: { id: true, businessCustomerMembershipId: true },
  });
  if (programMemberships.length === 0) return visitCounts;

  const ownerByProgramMembership = new Map(
    programMemberships.map((programMembership) => [programMembership.id, programMembership.businessCustomerMembershipId]),
  );

  const grouped = await prisma.stampTransaction.groupBy({
    by: ["customerProgramMembershipId"],
    where: {
      businessId,
      customerProgramMembershipId: { in: programMemberships.map((programMembership) => programMembership.id) },
      createdAt: { gte: windowStart, lte: now },
    },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const membershipId = ownerByProgramMembership.get(row.customerProgramMembershipId);
    if (membershipId === undefined) continue;
    visitCounts.set(membershipId, (visitCounts.get(membershipId) ?? 0) + row._count._all);
  }

  return visitCounts;
}
