/**
 * Excel-serial → wall-clock string helpers.
 *
 * The important invariant: whatever the user typed into the Excel cell must
 * come back out unchanged when we serialize it, regardless of the browser's
 * timezone. Historically we routed through a JS Date, which is timezone-
 * dependent (SheetJS constructs date cells in local time, but Excel serials
 * are timezone-agnostic — the mismatch produced ±offset shifts).
 *
 * The fix: for numeric serials we now use SheetJS's own SSF formatter, which
 * parses the serial arithmetically (no Date involved) and emits a fixed
 * "yyyy-mm-dd hh:mm:ss" string.
 */
import { SSF } from 'xlsx';

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Format a Date whose *UTC* accessors carry the wall-clock time.
 * Kept for callers that build Date via UTC (our own excelSerialToDate).
 */
export const formatJsDate = (d: Date): string => {
  if (Number.isNaN(d.getTime())) return '';
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
};

/**
 * Format a Date whose *local* accessors carry the wall-clock time. SheetJS
 * produces these when it converts date cells with `cellDates: true`.
 */
export const formatLocalDate = (d: Date): string => {
  if (Number.isNaN(d.getTime())) return '';
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

const EXCEL_UNIX_OFFSET_DAYS = 25569;
const MS_PER_DAY = 86400 * 1000;

const SERIAL_MIN = 20000; // ~1954
const SERIAL_MAX = 80000; // ~2118

export const isLikelyExcelSerial = (n: number): boolean =>
  Number.isFinite(n) && n >= SERIAL_MIN && n <= SERIAL_MAX;

export const excelSerialToDate = (serial: number): Date => {
  const ms = Math.round((serial - EXCEL_UNIX_OFFSET_DAYS) * MS_PER_DAY);
  return new Date(ms);
};

/**
 * Convert an Excel serial number directly to a "yyyy-mm-dd hh:mm:ss" string
 * via SheetJS's SSF formatter. This is entirely arithmetic — no JS Date is
 * constructed for the time-of-day components, so the browser's timezone
 * cannot shift the output.
 */
export const formatExcelSerial = (serial: number): string => {
  if (!isLikelyExcelSerial(serial)) return '';
  try {
    const out = SSF.format('yyyy-mm-dd hh:mm:ss', serial);
    return typeof out === 'string' ? out : '';
  } catch {
    // Fallback: our own UTC-based conversion.
    return formatJsDate(excelSerialToDate(serial));
  }
};

/**
 * If the given string looks like a bare Excel serial date (e.g.
 * "46176.82374"), convert it to "YYYY-MM-DD HH:mm:ss". Otherwise return
 * the input unchanged.
 */
export const formatSerialIfNumeric = (input: string): string => {
  const trimmed = input.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return input;
  const n = parseFloat(trimmed);
  if (!isLikelyExcelSerial(n)) return input;
  return formatExcelSerial(n);
};
