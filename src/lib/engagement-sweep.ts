import type { EngagementEventType } from "@prisma/client";

/**
 * Pure decision helpers for the daily engagement sweep.
 *
 * Kept free of Prisma and of runtime imports so the sweep's maths can be tested
 * directly against this source file, the same way customer-tiers.ts is.
 */

export type InactivityEventType = Extract<
  EngagementEventType,
  "INACTIVE_30_DAYS" | "INACTIVE_60_DAYS" | "INACTIVE_90_DAYS"
>;

// Ordered lowest bracket first; the sweep resolves the ones a customer has
// outgrown, so this doubles as the list of types a sweep may touch.
export const inactivityEventTypes: InactivityEventType[] = [
  "INACTIVE_30_DAYS",
  "INACTIVE_60_DAYS",
  "INACTIVE_90_DAYS",
];

const inactivityRanks: Record<InactivityEventType, number> = {
  INACTIVE_30_DAYS: 1,
  INACTIVE_60_DAYS: 2,
  INACTIVE_90_DAYS: 3,
};

// Widest bracket first: a customer who is 200 days quiet is 30 and 60 days
// quiet too, and only the 90-day event should be raised.
const inactivityThresholds: Array<{ days: number; type: InactivityEventType }> = [
  { days: 90, type: "INACTIVE_90_DAYS" },
  { days: 60, type: "INACTIVE_60_DAYS" },
  { days: 30, type: "INACTIVE_30_DAYS" },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const DEFAULT_TIME_ZONE = "Asia/Dubai";

/**
 * The lapsed bracket a customer falls into, or null while they are still
 * counted as active (anything under 30 days).
 */
export function decideInactivityBracket(daysInactive: number): InactivityEventType | null {
  if (!Number.isFinite(daysInactive)) return null;
  return inactivityThresholds.find((threshold) => daysInactive >= threshold.days)?.type ?? null;
}

/**
 * Orders the brackets 30 < 60 < 90 so the sweep can resolve the events a
 * customer has aged past. Anything that is not an inactivity type ranks 0.
 */
export function inactivityRank(type: EngagementEventType): number {
  return inactivityRanks[type as InactivityEventType] ?? 0;
}

/**
 * Whole days elapsed between two instants, truncated towards zero so a clock
 * skew that puts `to` before `from` reports a negative span rather than
 * rounding into a bracket.
 */
export function daysBetween(from: Date, to: Date): number {
  const elapsed = to.getTime() - from.getTime();
  if (!Number.isFinite(elapsed)) return 0;
  return Math.trunc(elapsed / DAY_IN_MS);
}

/**
 * Whether today is the customer's birthday in the business's timezone.
 *
 * The stored birthday carries date-only meaning and is written at UTC midnight
 * (see parseBirthday in lib/customers), so its month and day are read in UTC -
 * shifting it into a timezone would move a birthday a day off wherever the
 * offset is negative. Only "today" is timezone-dependent.
 *
 * A 29 February birthday simply does not match in a non-leap year; comparing
 * month and day cannot throw either way.
 */
export function isBirthdayToday(
  birthday: Date | null | undefined,
  now: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): boolean {
  if (!birthday) return false;
  if (!Number.isFinite(birthday.getTime())) return false;
  if (!Number.isFinite(now.getTime())) return false;

  const stored = `${pad(birthday.getUTCMonth() + 1)}-${pad(birthday.getUTCDate())}`;
  const today = calendarPartsInTimeZone(now, timeZone);

  return stored === `${today.month}-${today.day}`;
}

/**
 * The half-open [start, end) span of the calendar year `now` falls in, for the
 * "one birthday event per customer per year" check.
 *
 * The year is read in the business's timezone; the bounds themselves are UTC
 * instants, which is what the eventDate column stores.
 */
export function calendarYearBounds(now: Date, timeZone: string = DEFAULT_TIME_ZONE): { start: Date; end: Date } {
  const { year } = calendarPartsInTimeZone(now, timeZone);
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year + 1, 0, 1)) };
}

// Intl formatters are expensive to build and the sweep asks for the same one
// once per customer.
const formatters = new Map<string, Intl.DateTimeFormat>();

function calendarPartsInTimeZone(date: Date, timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }

  const parts = formatter.formatToParts(date);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return { year: Number(valueOf("year")), month: valueOf("month"), day: valueOf("day") };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
