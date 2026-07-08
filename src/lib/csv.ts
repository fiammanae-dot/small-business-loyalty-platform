export function toCsv(rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

// OWASP CSV injection mitigation: a leading =, +, -, or @ is interpreted as a formula
// by Excel/Sheets/Numbers. Prefixing with a single quote forces those programs to
// treat the cell as plain text instead of evaluating it. Shared with the Excel (XLSX)
// export writer, which renders the same row data and carries the same risk.
const FORMULA_TRIGGER = /^[=+\-@]/;

export function sanitizeExportCell(text: string) {
  return FORMULA_TRIGGER.test(text) ? `'${text}` : text;
}

function csvCell(value: string | number | boolean | null | undefined) {
  const text = sanitizeExportCell(value === null || value === undefined ? "" : String(value));
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
