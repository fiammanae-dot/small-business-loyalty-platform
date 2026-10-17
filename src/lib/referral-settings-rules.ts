/**
 * Pure rules for the business referral reward (no database), so they can be
 * unit-tested and shared by the form, the action and the public landing page.
 */
import { translateFor } from "@/i18n/dictionaries";
import { resolveLocale } from "@/i18n/locales";

export type ReferralRewardKind = "NONE" | "STAMPS" | "CASHBACK";

export type ReferralSettingsView = {
  rewardType: ReferralRewardKind;
  stampProgramId: number | null;
  stampProgramName: string | null;
  referrerStamps: number;
  friendStamps: number;
  referrerCashback: number;
  friendCashback: number;
};

export type ReferralSettingsData = {
  rewardType: ReferralRewardKind;
  stampProgramId: number | null;
  referrerStamps: number;
  friendStamps: number;
  referrerCashback: number;
  friendCashback: number;
};

export type ParsedReferralSettings = { ok: true; data: ReferralSettingsData } | { ok: false; error: string };

/** The stored row as the rest of the app sees it; null (no row yet) means no reward. */
export function toView(
  row:
    | {
        rewardType: ReferralRewardKind;
        stampProgramId: number | null;
        referrerStamps: number;
        friendStamps: number;
        referrerCashback: { toString(): string } | number | string;
        friendCashback: { toString(): string } | number | string;
        stampProgram?: { id: number; name: string; active: boolean; isMembership: boolean } | null;
      }
    | null,
): ReferralSettingsView {
  if (!row) return { rewardType: "NONE", stampProgramId: null, stampProgramName: null, referrerStamps: 1, friendStamps: 0, referrerCashback: 0, friendCashback: 0 };
  // A chosen program that was since deleted, closed or turned into a package no longer pays.
  const program = row.stampProgram && row.stampProgram.active && !row.stampProgram.isMembership ? row.stampProgram : null;
  return {
    rewardType: row.rewardType === "STAMPS" && !program ? "NONE" : row.rewardType,
    stampProgramId: program?.id ?? null,
    stampProgramName: program?.name ?? null,
    referrerStamps: row.referrerStamps,
    friendStamps: row.friendStamps,
    referrerCashback: Number(row.referrerCashback),
    friendCashback: Number(row.friendCashback),
  };
}

const MAX_STAMPS = 20;
const MAX_CASHBACK = 1000;

function wholeNumber(value: string | undefined, max: number): number | null {
  if (value === undefined || value.trim() === "") return 0;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) return null;
  return n;
}

function money(value: string | undefined, max: number): number | null {
  if (value === undefined || value.trim() === "") return 0;
  const n = Math.round(Number(value) * 100) / 100;
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return n;
}

/**
 * Validates the Referrals page form. `programIds` are the stamp programs the
 * reward may use (active, not packages); cashback needs the cashback program.
 */
export function parseReferralSettingsInput(
  input: Record<string, string | undefined>,
  context: { programIds: number[]; cashbackEnabled: boolean },
): ParsedReferralSettings {
  const rewardType = input.rewardType;
  if (rewardType !== "NONE" && rewardType !== "STAMPS" && rewardType !== "CASHBACK") return { ok: false, error: "Choose a referral reward." };

  if (rewardType === "NONE") {
    return { ok: true, data: { rewardType, stampProgramId: null, referrerStamps: 1, friendStamps: 0, referrerCashback: 0, friendCashback: 0 } };
  }

  if (rewardType === "STAMPS") {
    const stampProgramId = Number(input.stampProgramId);
    if (!context.programIds.includes(stampProgramId)) return { ok: false, error: "Choose which stamp card the bonus stamps go to." };
    const referrerStamps = wholeNumber(input.referrerStamps, MAX_STAMPS);
    const friendStamps = wholeNumber(input.friendStamps, MAX_STAMPS);
    if (referrerStamps === null || friendStamps === null) return { ok: false, error: `Bonus stamps must be a whole number from 0 to ${MAX_STAMPS}.` };
    if (referrerStamps === 0 && friendStamps === 0) return { ok: false, error: "Give at least one bonus stamp to the referrer or the friend, or choose No reward." };
    return { ok: true, data: { rewardType, stampProgramId, referrerStamps, friendStamps, referrerCashback: 0, friendCashback: 0 } };
  }

  if (!context.cashbackEnabled) return { ok: false, error: "Set up the cashback program first to reward referrals with cashback." };
  const referrerCashback = money(input.referrerCashback, MAX_CASHBACK);
  const friendCashback = money(input.friendCashback, MAX_CASHBACK);
  if (referrerCashback === null || friendCashback === null) return { ok: false, error: `Cashback amounts must be between 0 and ${MAX_CASHBACK}.` };
  if (referrerCashback === 0 && friendCashback === 0) return { ok: false, error: "Give some cashback to the referrer or the friend, or choose No reward." };
  return { ok: true, data: { rewardType, stampProgramId: null, referrerStamps: 1, friendStamps: 0, referrerCashback, friendCashback } };
}

/** Plain-language summary for the owner's page and the friend's landing page, in the reader's language. */
export function describeReferralReward(settings: ReferralSettingsView, currency = "AED", locale: string | null = "en"): { referrer: string | null; friend: string | null } {
  const t = translateFor(resolveLocale(locale));
  const stamps = (n: number) => t("referral.reward.stampsOn", { stamps: t.plural("referral.reward.stamps", n), program: settings.stampProgramName ?? "" });
  const cashback = (amount: number) => t("referral.reward.cashback", { currency, amount: amount.toFixed(2) });
  if (settings.rewardType === "STAMPS" && settings.stampProgramName) {
    return {
      referrer: settings.referrerStamps > 0 ? stamps(settings.referrerStamps) : null,
      friend: settings.friendStamps > 0 ? stamps(settings.friendStamps) : null,
    };
  }
  if (settings.rewardType === "CASHBACK") {
    return {
      referrer: settings.referrerCashback > 0 ? cashback(settings.referrerCashback) : null,
      friend: settings.friendCashback > 0 ? cashback(settings.friendCashback) : null,
    };
  }
  return { referrer: null, friend: null };
}
