/**
 * Excel stores dates as serial numbers: day count since 1900-01-01.
 * Excel's epoch differs from Unix by 25569 days (1970-01-01 = serial 25569).
 *
 * When SheetJS reads a workbook without a date number-format, the cell stays
 * a raw number like 46176.82374. We convert that into a human-readable
 * "YYYY-MM-DD HH:mm:ss" string here.
 *
 * We use UTC accessors so the printed value matches what the user sees in
 * Excel (Excel serials are tz-agnostic; using local time would shift hours).
 */

const pad = (n: number): string => String(n).padStart(2, '0');

export const formatJsDate = (d: Date): string => {
  if (Number.isNaN(d.getTime())) return '';
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
};

/** Days since Unix epoch to Excel-serial-1900 epoch. */
const EXCEL_UNIX_OFFSET_DAYS = 25569;
const MS_PER_DAY = 86400 * 1000;

/** Serials below this are unlikely to be modern dates and likely something else (durations etc.). */
const SERIAL_MIN = 20000; // ~1954
/** Serials above this are unlikely to be valid dates. */
const SERIAL_MAX = 80000; // ~2118

export const isLikelyExcelSerial = (n: number): boolean =>
  Number.isFinite(n) && n >= SERIAL_MIN && n <= SERIAL_MAX;

export const excelSerialToDate = (serial: number): Date => {
  const ms = Math.round((serial - EXCEL_UNIX_OFFSET_DAYS) * MS_PER_DAY);
  return new Date(ms);
};

/**
 * If the given string looks like a bare Excel serial date (e.g. "46176.82374"),
 * convert it to "YYYY-MM-DD HH:mm:ss". Otherwise return the input unchanged.
 */
export const formatSerialIfNumeric = (input: string): string => {
  const trimmed = input.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return input;
  const n = parseFloat(trimmed);
  if (!isLikelyExcelSerial(n)) return input;
  return formatJsDate(excelSerialToDate(n));
};
