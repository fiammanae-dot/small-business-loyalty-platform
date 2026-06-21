export const alertTypeLabels: Record<string, string> = {
  MULTIPLE_STAMPS_QUANTITY_3: "Multiple stamps issued in one transaction",
  MULTIPLE_STAMPS_QUANTITY_5: "Maximum stamp quantity issued",
  REPEATED_STAMPS_SHORT_WINDOW: "Repeated stamps issued in a short time",
  CUSTOMER_24H_HIGH_VOLUME: "Unusually high customer activity within 24 hours",
  STAFF_24H_HIGH_VOLUME: "Unusually high staff activity within 24 hours",
  FAST_REWARD_PROGRESS: "Customer reached reward unusually fast",
  MULTIPLE_STAMPS: "Multiple stamps issued in one transaction",
  MAX_QUANTITY_STAMPS: "Maximum stamp quantity issued",
};

export function alertTypeLabel(alertType: string) {
  return alertTypeLabels[alertType] ?? alertType.replaceAll("_", " ").toLowerCase();
}


