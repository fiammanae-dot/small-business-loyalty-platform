export function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatMoney(value: { toString(): string }) {
  return `$${Number(value.toString()).toFixed(2)}`;
}
