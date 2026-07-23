import "server-only";

import type { CardTheme } from "@prisma/client";

export type WalletRelevantProgramFields = {
  name: string;
  rewardName: string;
  cardTheme: CardTheme;
  active: boolean;
};

export type WalletRelevantBrandingFields = {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
};

export type WalletRelevantBusinessFields = {
  name: string;
  branding: WalletRelevantBrandingFields | null;
};

/**
 * Single source of truth for "does this change affect what's rendered on an
 * issued Google Wallet pass." Every save flow compares its before/after state
 * through these two functions instead of re-deciding its own field list, so
 * a field only needs to be added here once to cover every caller.
 */
export function hasWalletRelevantProgramChange(before: WalletRelevantProgramFields, after: WalletRelevantProgramFields): boolean {
  return (
    before.name !== after.name ||
    before.rewardName !== after.rewardName ||
    before.cardTheme !== after.cardTheme ||
    before.active !== after.active
  );
}

export function hasWalletRelevantBusinessChange(before: WalletRelevantBusinessFields, after: WalletRelevantBusinessFields): boolean {
  if (before.name !== after.name) return true;
  return hasWalletRelevantBrandingChange(before.branding, after.branding);
}

export function hasWalletRelevantBrandingChange(before: WalletRelevantBrandingFields | null, after: WalletRelevantBrandingFields | null): boolean {
  if (!before && !after) return false;
  if (!before || !after) return true;

  return (
    before.logoUrl !== after.logoUrl ||
    before.primaryColor !== after.primaryColor ||
    before.secondaryColor !== after.secondaryColor ||
    before.backgroundColor !== after.backgroundColor ||
    before.textColor !== after.textColor ||
    before.buttonColor !== after.buttonColor
  );
}
