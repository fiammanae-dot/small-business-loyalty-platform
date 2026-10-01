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
