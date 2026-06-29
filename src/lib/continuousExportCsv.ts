import * as XLSX from 'xlsx';
import type { UnfilteredContinuousFile } from '../types';
import type { DriverNameLookup } from './driverLookup';

interface CleanContinuousRow {
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

const COLUMNS: (keyof CleanContinuousRow)[] = [
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

const isUsable = (row: CleanContinuousRow): boolean =>
  !!(row.Transporter || row.VID) &&
  !!(row['Time A'] || row['Time B'] || row.Duration || row.Length);

export const buildCleanContinuousRows = (
  files: UnfilteredContinuousFile[],
  resolveDriver?: DriverNameLookup,
): CleanContinuousRow[] => {
  const out: CleanContinuousRow[] = [];
  files.forEach((file) => {
    file.drivers.forEach((driver) => {
      const rank = driver.rows.length;
      const vid = sanitize(driver.vid);
      const driversData = resolveDriver ? resolveDriver(vid) : '';
      driver.rows.forEach((r) => {
        const row: CleanContinuousRow = {
          Transporter: sanitize(driver.driverName),
          VID: vid,
          'Drivers Data': driversData,
          Period: sanitize(driver.period),
          'Time A': sanitize(r.timeA),
          'Position A': sanitize(r.positionA),
          'Time B': sanitize(r.timeB),
          'Position B': sanitize(r.positionB),
          Duration: sanitize(r.duration),
          Length: sanitize(r.length),
          Rank: rank,
        };
        if (isUsable(row)) out.push(row);
      });
    });
  });
  // Sort by rank descending — worst offenders at the top of the CSV.
  return out.sort((a, b) => b.Rank - a.Rank);
};

export const downloadCleanContinuousCsv = (
  files: UnfilteredContinuousFile[],
  resolveDriver?: DriverNameLookup,
  filename = `fleetwatch-continuous-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const rows = buildCleanContinuousRows(files, resolveDriver);
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLUMNS as string[] });
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
