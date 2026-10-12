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

export type PackageValidityValue = "LIFETIME" | "MONTHLY_FORFEIT" | "FIXED_TERM";

export type PackageRules = {
  packageValidity: PackageValidityValue;
  packageTermMonths: number | null;
  packageOneVisitPerMonth: boolean;
  packageUniqueTreatments: boolean;
};

/**
 * The package month that contains `now`. Package months run from the join (or
 * renewal) date, the same months the monthly expiry uses: joined 10 Jan means
 * 10 Jan - 10 Feb, 10 Feb - 10 Mar, and so on.
 */
export function packageMonthWindow(enrolledAt: Date, now: Date): { start: Date; end: Date } {
  let k = 0;
  // A package lasts at most a few years; the bound only guards bad data.
  while (k < 600 && addMonths(enrolledAt, k + 1) <= now) k += 1;
  return { start: addMonths(enrolledAt, k), end: addMonths(enrolledAt, k + 1) };
}

/** When every unused visit expires, or null when the package has no end date. */
export function packageExpiresAt(rules: Pick<PackageRules, "packageValidity" | "packageTermMonths">, enrolledAt: Date): Date | null {
  if (rules.packageValidity !== "FIXED_TERM" || !rules.packageTermMonths || rules.packageTermMonths < 1) return null;
  return addMonths(enrolledAt, rules.packageTermMonths);
}

export function isPackageExpired(rules: Pick<PackageRules, "packageValidity" | "packageTermMonths">, enrolledAt: Date, now: Date) {
  const expiresAt = packageExpiresAt(rules, enrolledAt);
  return expiresAt !== null && now >= expiresAt;
}

/**
 * Fixed-term expiry: once the term has passed, every visit still left is
 * forfeited in one go. Returns the new forfeited count (unchanged before the
 * end date or when nothing is left).
 */
export function computeFixedTermForfeit(input: {
  enrolledAt: Date;
  now: Date;
  termMonths: number;
  requiredStamps: number;
  earnedStamps: number;
  bonusStamps?: number;
  sessionsForfeited: number;
}): { newSessionsForfeited: number; forfeitedThisRun: number; expired: boolean } {
  const expired = input.termMonths >= 1 && input.now >= addMonths(input.enrolledAt, input.termMonths);
  const used = input.earnedStamps + (input.bonusStamps ?? 0);
  const remaining = Math.max(0, input.requiredStamps - used - input.sessionsForfeited);
  if (!expired || remaining === 0) {
    return { newSessionsForfeited: input.sessionsForfeited, forfeitedThisRun: 0, expired };
  }
  return { newSessionsForfeited: input.sessionsForfeited + remaining, forfeitedThisRun: remaining, expired };
}

/** One plain sentence per rule, for the owner, staff and customer screens. */
export function describePackageRules(rules: PackageRules): string[] {
  const lines: string[] = [];
  if (rules.packageValidity === "LIFETIME") lines.push("Lifetime - visits never expire.");
  else if (rules.packageValidity === "FIXED_TERM") {
    const months = rules.packageTermMonths ?? 0;
    lines.push(`Expires ${months} month${months === 1 ? "" : "s"} after joining - unused visits are lost.`);
  } else lines.push("Loses 1 visit for each month without a visit.");
  lines.push(rules.packageOneVisitPerMonth ? "One visit per month." : "More than one visit a month allowed.");
  lines.push(rules.packageUniqueTreatments ? "Each treatment can be used only once." : "Treatments can be repeated.");
  return lines;
}
