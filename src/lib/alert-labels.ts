export const alertTypeLabels: Record<string, string> = {
  MULTIPLE_STAMPS_QUANTITY_3: "Several stamps or visits at once",
  MULTIPLE_STAMPS_QUANTITY_5: "Maximum stamps or visits at once",
  REPEATED_STAMPS_SHORT_WINDOW: "Repeated stamps within 10 minutes",
  CUSTOMER_24H_HIGH_VOLUME: "Customer got many stamps in 24 hours",
  STAFF_24H_HIGH_VOLUME: "Staff member gave many stamps in 24 hours",
  FAST_REWARD_PROGRESS: "Card filled or package used unusually fast",
  HIGH_STAMP_UNDO_COUNT: "Many stamps undone",
  INVALID_SCAN_VOLUME: "Many invalid card scans",
  WRONG_BUSINESS_SCAN_VOLUME: "Cards from other businesses scanned",
  REFERRAL_HIGH_VOLUME: "Many referrals from one customer",
  HIGH_REWARD_REDEMPTIONS: "Many rewards given by one staff member",
  CASHBACK_LARGE_BILL: "Cashback on a large bill",
  CASHBACK_FREQUENT_EARN: "Cashback added often to one customer",
  CASHBACK_LARGE_REDEMPTION: "Large cashback used",
  COOLDOWN_MAX_STAMPS_PER_TRANSACTION: "Loyalty rule: too many stamps at once",
  COOLDOWN_MINIMUM_MINUTES_BETWEEN_STAMPS: "Loyalty rule: stamped again too soon",
  COOLDOWN_MAX_STAMPS_PER_CUSTOMER_PER_DAY: "Loyalty rule: customer daily limit",
  COOLDOWN_MAX_STAMPS_PER_STAFF_PER_DAY: "Loyalty rule: staff daily limit",
  COOLDOWN_UNAUTHORIZED_COOLDOWN_OVERRIDE: "Loyalty rule: override without permission",
  COOLDOWN_MISSING_COOLDOWN_OVERRIDE_REASON: "Loyalty rule: override without a reason",
  MULTIPLE_STAMPS: "Several stamps or visits at once",
  MAX_QUANTITY_STAMPS: "Maximum stamps or visits at once",
};

export function alertTypeLabel(alertType: string) {
  if (alertTypeLabels[alertType]) return alertTypeLabels[alertType];
  if (alertType.startsWith("COOLDOWN_")) return `Loyalty rule: ${alertType.slice(9).replaceAll("_", " ").toLowerCase()}`;
  const text = alertType.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}


