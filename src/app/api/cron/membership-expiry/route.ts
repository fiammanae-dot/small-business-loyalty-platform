import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { logAuditEvent } from "@/lib/audit";
import { computeMembershipForfeit } from "@/lib/membership-sessions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily membership use-it-or-lose-it sweep.
 *
 * A membership tier sells a fixed number of prepaid sessions, one per month
 * from the join date. A month that passes without a visit loses that month's
 * session. This walks active membership enrollments and forfeits one session
 * for every whole elapsed month with no visit, never taking more than the
 * customer has left. The arithmetic and month boundaries live in
 * computeMembershipForfeit so they can be reasoned about in isolation; this
 * route only supplies the data and persists the result.
 *
 * Idempotent: forfeitCyclesProcessed records how many months were already
 * evaluated, so running daily never double-counts a month.
 */

const MEMBERSHIP_BATCH_SIZE = 200;

type SweepError = {
  programMembershipId: number;
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
    console.error("Membership expiry sweep refused to run: CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Cron secret is not configured." }, { status: 500 });
  }

  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const errors: SweepError[] = [];
  let membershipsChecked = 0;
  let membershipsUpdated = 0;
  let sessionsForfeited = 0;

  let cursor: number | undefined;

  for (;;) {
    const enrollments = await prisma.customerProgramMembership.findMany({
      where: {
        status: "ACTIVE",
        loyaltyProgram: { isMembership: true },
      },
      select: {
        id: true,
        enrolledAt: true,
        earnedStamps: true,
        bonusStamps: true,
        sessionsForfeited: true,
        forfeitCyclesProcessed: true,
        loyaltyProgram: { select: { requiredStamps: true, name: true, businessId: true } },
      },
      orderBy: { id: "asc" },
      take: MEMBERSHIP_BATCH_SIZE,
      ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
    });

    if (enrollments.length === 0) break;
    cursor = enrollments[enrollments.length - 1].id;

    for (const enrollment of enrollments) {
      membershipsChecked += 1;

      // One enrollment's failure must not cost the rest of the sweep.
      try {
        const requiredStamps = enrollment.loyaltyProgram.requiredStamps;

        // Nothing to do until at least the first month has fully elapsed, or
        // once every cycle has already been evaluated.
        if (enrollment.forfeitCyclesProcessed >= requiredStamps) continue;

        const visits = await prisma.stampTransaction.findMany({
          where: { customerProgramMembershipId: enrollment.id },
          select: { createdAt: true },
        });

        const result = computeMembershipForfeit({
          enrolledAt: enrollment.enrolledAt,
          now,
          requiredStamps,
          earnedStamps: enrollment.earnedStamps,
          bonusStamps: enrollment.bonusStamps,
          sessionsForfeited: enrollment.sessionsForfeited,
          forfeitCyclesProcessed: enrollment.forfeitCyclesProcessed,
          visitTimestamps: visits.map((visit) => visit.createdAt),
        });

        const cyclesChanged = result.newForfeitCyclesProcessed !== enrollment.forfeitCyclesProcessed;
        const forfeitChanged = result.newSessionsForfeited !== enrollment.sessionsForfeited;
        if (!cyclesChanged && !forfeitChanged) continue;

        await prisma.$transaction(async (tx) => {
          await tx.customerProgramMembership.update({
            where: { id: enrollment.id },
            data: {
              sessionsForfeited: result.newSessionsForfeited,
              forfeitCyclesProcessed: result.newForfeitCyclesProcessed,
            },
          });

          if (result.forfeitedThisRun > 0) {
            await logAuditEvent({
              tx,
              actorUserId: null,
              businessId: enrollment.loyaltyProgram.businessId,
              action: "MEMBERSHIP_SESSION_FORFEITED",
              entityType: "customer_program_membership",
              entityId: enrollment.id,
              metadata: {
                programName: enrollment.loyaltyProgram.name,
                forfeitedThisRun: result.forfeitedThisRun,
                sessionsForfeited: result.newSessionsForfeited,
                forfeitCyclesProcessed: result.newForfeitCyclesProcessed,
                requiredStamps,
                used: enrollment.earnedStamps + enrollment.bonusStamps,
              },
            });
          }
        });

        membershipsUpdated += 1;
        sessionsForfeited += result.forfeitedThisRun;
      } catch (error) {
        errors.push({ programMembershipId: enrollment.id, message: describeError(error) });
      }
    }

    if (enrollments.length < MEMBERSHIP_BATCH_SIZE) break;
  }

  const summary = { membershipsChecked, membershipsUpdated, sessionsForfeited, errors };
  console.info("Membership expiry sweep completed.", {
    membershipsChecked,
    membershipsUpdated,
    sessionsForfeited,
    errorCount: errors.length,
  });

  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}
