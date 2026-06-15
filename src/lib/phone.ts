export function normalizePhone(phone: string) {
  const compact = phone.trim().replace(/[\s\-()]/g, "");
  let digits = compact.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00971")) digits = digits.slice(2);

  if (digits.startsWith("05")) {
    digits = `971${digits.slice(1)}`;
  }

  if (!digits.startsWith("9715") || digits.length !== 12) return null;

  return `+${digits}`;
}

export function formatUaePhoneDisplay(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;
  return `0${normalized.slice(4, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
}

export function formatUaePhoneForWhatsApp(phone: string) {
  const normalized = normalizePhone(phone);
  return normalized ? normalized.replace(/^\+/, "") : null;
}
