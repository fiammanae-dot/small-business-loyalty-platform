export function normalizePhone(phone: string) {
  let normalized = phone.trim().replace(/[\s\-()]/g, "");

  if (normalized.startsWith("05")) {
    normalized = `+971${normalized.slice(1)}`;
  } else if (normalized.startsWith("971")) {
    normalized = `+${normalized}`;
  } else if (!normalized.startsWith("+") && normalized.length > 0) {
    normalized = `+${normalized}`;
  }

  return normalized;
}
