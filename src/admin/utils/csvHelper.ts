/**
 * CSV export helpers.
 *
 * The admin dashboard exports user lists and audit records to CSV. These
 * helpers do the string-level formatting without pulling in a dependency.
 */

import { escapeCsvField } from './stringUtils';

export interface CsvColumn<T> {
  key: string;
  header: string;
  select: (row: T) => string | number | boolean | undefined | null;
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const headerRow = columns.map((col) => escapeCsvField(col.header)).join(',');
  const bodyRows = rows.map((row) =>
    columns
      .map((col) => {
        const value = col.select(row);
        if (value === undefined || value === null) return '';
        return escapeCsvField(String(value));
      })
      .join(','),
  );
  return [headerRow, ...bodyRows].join('\n');
}

export function csvFilename(base: string, timestamp: string): string {
  const safeBase = base.replace(/[^a-z0-9-]/gi, '-').slice(0, 64) || 'export';
  return `${safeBase}-${timestamp}.csv`;
}

export function csvBlob(content: string): Blob {
  return new Blob([content], { type: 'text/csv;charset=utf-8;' });
}

export function csvDownloadUrl(content: string): string {
  const blob = csvBlob(content);
  return URL.createObjectURL(blob);
}

export function parseSimpleCsv(input: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      current.push(field);
      field = '';
    } else if (char === '\n') {
      current.push(field);
      rows.push(current);
      current = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows;
}
