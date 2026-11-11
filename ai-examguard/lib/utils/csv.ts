/**
 * Neutralizes spreadsheet formula injection payloads (=, +, -, @, tab, CR)
 * while preserving legitimate negative numbers (e.g. -0.25, -10) and quoting
 * all cells for safe RFC 4180 CSV export.
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const isFormulaRisk =
    /^[=+@\t\r]/.test(raw) || (raw.startsWith('-') && !/^-\d+(\.\d+)?$/.test(raw));
  const safe = isFormulaRisk ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildCsvDocument(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): string {
  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');
}
