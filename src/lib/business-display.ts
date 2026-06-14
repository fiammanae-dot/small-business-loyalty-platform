const GENERATED_NAME_SUFFIX = /\s+\d{10,}(?:\s+Updated)?$/i;

export function getBusinessDisplayName(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "Unnamed Business";

  const cleaned = trimmed.replace(GENERATED_NAME_SUFFIX, "").trim();
  return cleaned || "Unnamed Business";
}

export function getBusinessTypeDisplayName(typeLabel: string | null | undefined) {
  const trimmed = typeLabel?.trim();
  return trimmed || "Business";
}
