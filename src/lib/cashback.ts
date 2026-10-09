/**
 * Cashback wallet arithmetic (Feature 2).
 *
 * All money is AED carried to two decimal places (fils). These helpers are pure
 * so the add/spend server actions, the customer-profile display and the tests
 * all agree on the same rounding and the same guards. Every amount STORED on a
 * ledger row is a positive magnitude - the row's `type` (EARN / SPEND / REVERSAL)
 * carries the direction - so these helpers deal in positive amounts and signed
 * deltas only where a balance is being moved.
 *
 * Amounts are handled as numbers rounded to two decimals on every step, which is
 * exact for the bill sizes a clinic deals in (well inside the safe-integer range
 * once scaled to fils).
 */

/** Round an AED amount to two decimal places (fils). */
export function roundAed(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Cashback earned on a bill: ratePercent% of the amount paid, rounded to fils.
 * A non-positive bill or rate earns nothing.
 */
export function computeCashbackEarn(billAmount: number, ratePercent: number): number {
  if (!(billAmount > 0) || !(ratePercent > 0)) return 0;
  return roundAed((billAmount * ratePercent) / 100);
}

/** Whether `amount` can be spent from `balance`: positive and within balance. */
export function canSpendCashback(balance: number, amount: number): boolean {
  return amount > 0 && roundAed(amount) <= roundAed(balance);
}

/**
 * Apply a signed delta to a balance, clamped so a wallet can never go negative.
 * Returns the new balance rounded to fils.
 */
export function applyCashbackDelta(balance: number, delta: number): number {
  return roundAed(Math.max(0, roundAed(balance) + delta));
}

/** Format an AED amount for display, e.g. 1234.5 -> "AED 1,234.50". */
export function formatAed(value: number, currency = "AED"): string {
  const amount = roundAed(value).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${amount}`;
}

/**
 * Cashback is a program customers JOIN, like a stamp or membership program.
 * A customer is a member once `cashbackJoinedAt` is set - by staff at the
 * counter, by ticking it when the customer is created, or by the customer
 * joining with the cashback join link. Non-members cannot earn or spend.
 */
export function isCashbackMember(customer: { cashbackJoinedAt?: Date | string | null } | null | undefined): boolean {
  return Boolean(customer?.cashbackJoinedAt);
}

/** The message staff see when they try to move cashback for a non-member. */
export const CASHBACK_NOT_JOINED_MESSAGE = "This customer has not joined the cashback program yet. Enrol them first.";

/** The cashback program as a joinable choice on enrolment forms, or null when it is off. */
export function cashbackProgramOption(
  settings: { enabled: boolean; name?: string | null; ratePercent?: { toString(): string } | number | null } | null | undefined,
): { name: string; ratePercent: string } | null {
  if (!settings?.enabled) return null;
  return {
    name: settings.name?.trim() || "Cashback",
    ratePercent: settings.ratePercent != null ? Number(settings.ratePercent.toString()).toString() : "5",
  };
}
