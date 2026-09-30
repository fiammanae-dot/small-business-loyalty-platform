/**
 * Prepaid membership session accounting.
 *
 * A membership tier sells a fixed number of sessions (the program's
 * requiredStamps). Each visit uses one session (earnedStamps increments in the
 * scan flow, exactly as before), and the monthly use-it-or-lose-it sweep
 * forfeits one unused session for every whole month that passes without a
 * visit (sessionsForfeited). What the customer has left to spend is therefore
 * the total minus what they used minus what they forfeited - the card counts
 * DOWN even though the underlying counters count up.
 *
 * These helpers are pure so both the display layer and the forfeit cron agree
 * on the arithmetic, and so the month-boundary logic can be reasoned about and
 * tested without a database.
 */

export type MembershipSessionSummary = {
  /** Total sessions the membership was sold with. */
  total: number;
  /** Sessions consumed by visits. */
  used: number;
  /** Sessions auto-forfeited by the monthly sweep. */
  forfeited: number;
  /** Sessions still available to spend (never below zero). */
  remaining: number;
};

export function membershipSessionSummary(input: {
  requiredStamps: number;
  earnedStamps: number;
  bonusStamps?: number;
  sessionsForfeited: number;
}): MembershipSessionSummary {
  const total = input.requiredStamps;
  const used = input.earnedStamps + (input.bonusStamps ?? 0);
  const forfeited = input.sessionsForfeited;
  const remaining = Math.max(0, total - used - forfeited);
  return { total, used, forfeited, remaining };
}

/**
 * Add whole calendar months to a date, clamping the day so that, e.g.,
 * Jan 31 + 1 month lands on the last day of February rather than spilling into
 * March. This keeps each monthly cycle anchored to the enrollment day.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfMonth));
  return result;
}

/**
 * Decide how many sessions to forfeit for a membership, evaluating each whole
 * month since enrollment that the sweep has not looked at yet.
 *
 * A cycle is the month running from enrolledAt + k months to enrolledAt +
 * (k+1) months. A cycle is only evaluated once it has fully elapsed (now is at
 * or past its end), and each evaluated cycle advances forfeitCyclesProcessed so
 * it is never counted twice. Within an elapsed cycle, one session is forfeited
 * only when the customer recorded no visit in that window and still has
 * sessions left to lose. Cycles stop at the total the membership was sold with,
 * so used + forfeited can never exceed it.
 */
export function computeMembershipForfeit(input: {
  enrolledAt: Date;
  now: Date;
  requiredStamps: number;
  earnedStamps: number;
  bonusStamps?: number;
  sessionsForfeited: number;
  forfeitCyclesProcessed: number;
  /** All stamp-transaction timestamps for this membership. */
  visitTimestamps: Date[];
}): { newSessionsForfeited: number; newForfeitCyclesProcessed: number; forfeitedThisRun: number } {
  const totalCycles = input.requiredStamps;
  const used = input.earnedStamps + (input.bonusStamps ?? 0);

  let cyclesProcessed = input.forfeitCyclesProcessed;
  let forfeited = input.sessionsForfeited;
  let forfeitedThisRun = 0;

  while (cyclesProcessed < totalCycles) {
    const cycleStart = addMonths(input.enrolledAt, cyclesProcessed);
    const cycleEnd = addMonths(input.enrolledAt, cyclesProcessed + 1);

    // Only look at a month once it has fully passed.
    if (input.now < cycleEnd) break;

    const remaining = input.requiredStamps - used - forfeited;
    if (remaining > 0) {
      const visitedThisCycle = input.visitTimestamps.some(
        (timestamp) => timestamp >= cycleStart && timestamp < cycleEnd,
      );
      if (!visitedThisCycle) {
        forfeited += 1;
        forfeitedThisRun += 1;
      }
    }

    cyclesProcessed += 1;
  }

  return {
    newSessionsForfeited: forfeited,
    newForfeitCyclesProcessed: cyclesProcessed,
    forfeitedThisRun,
  };
}
