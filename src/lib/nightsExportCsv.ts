import * as XLSX from 'xlsx';
import type { UnfilteredNightFile } from '../types';
import type { DriverNameLookup } from './driverLookup';

interface CleanNightRow {
  Transporter: string;
  VID: string;
  'Drivers Data': string;
  Period: string;
  'Time A': string;
  'Position A': string;
  'Time B': string;
  'Position B': string;
  Duration: string;
  Length: string;
  Rank: number;
}

const NIGHT_COLUMNS: (keyof CleanNightRow)[] = [
  'Transporter',
  'VID',
  'Drivers Data',
  'Period',
  'Time A',
  'Position A',
  'Time B',
  'Position B',
  'Duration',
  'Length',
  'Rank',
];

const sanitize = (s: string): string =>
  s
    .replace(/ /g, ' ')
    .replace(/[°º]/g, '')
    .replace(/\bET\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const isUsable = (row: CleanNightRow): boolean =>
  !!(row.Transporter || row.VID) &&
  !!(row['Time A'] || row['Time B'] || row.Duration || row.Length);

export const buildCleanNightRows = (
  files: UnfilteredNightFile[],
  resolveDriver?: DriverNameLookup,
): CleanNightRow[] => {
  const out: CleanNightRow[] = [];
  files.forEach((file) => {
    file.drivers.forEach((driver) => {
      const rank = driver.rows.length;
      const vid = sanitize(driver.vid);
      const driversData = resolveDriver ? resolveDriver(vid) : '';
      driver.rows.forEach((nr) => {
        const row: CleanNightRow = {
          Transporter: sanitize(driver.driverName),
          VID: vid,
          'Drivers Data': driversData,
          Period: sanitize(driver.period),
          'Time A': sanitize(nr.timeA),
          'Position A': sanitize(nr.positionA),
          'Time B': sanitize(nr.timeB),
          'Position B': sanitize(nr.positionB),
          Duration: sanitize(nr.duration),
          Length: sanitize(nr.length),
          Rank: rank,
        };
        if (isUsable(row)) out.push(row);
      });
    });
  });
  // Sort by rank descending — worst offenders at the top of the CSV.
  return out.sort((a, b) => b.Rank - a.Rank);
};

export const downloadCleanNightsCsv = (
  files: UnfilteredNightFile[],
  resolveDriver?: DriverNameLookup,
  filename = `fleetwatch-nights-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const rows = buildCleanNightRows(files, resolveDriver);
  const ws = XLSX.utils.json_to_sheet(rows, { header: NIGHT_COLUMNS as string[] });
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return rows.length;
};
