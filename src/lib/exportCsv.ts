import * as XLSX from 'xlsx';
import type { UnfilteredFile } from '../types';
import type { DriverNameLookup } from './driverLookup';

interface CleanSpeedRow {
  Transporter: string;
  VID: string;
  'Drivers Data': string;
  Period: string;
  Start: string;
  End: string;
  Duration: string;
  'Top Speed': string;
  'Overspeed Position': string;
  Rank: number;
}

const SPEED_COLUMNS: (keyof CleanSpeedRow)[] = [
  'Transporter',
  'VID',
  'Drivers Data',
  'Period',
  'Start',
  'End',
  'Duration',
  'Top Speed',
  'Overspeed Position',
  'Rank',
];

const sanitize = (s: string): string =>
  s
    .replace(/ /g, ' ')
    .replace(/[°º]/g, '')
    .replace(/\bET\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const isUsable = (row: CleanSpeedRow): boolean =>
  !!(row.Transporter || row.VID) &&
  !!(row.Start || row.End || row['Top Speed'] || row['Overspeed Position']);

export const buildCleanRows = (
  files: UnfilteredFile[],
  resolveDriver?: DriverNameLookup,
): CleanSpeedRow[] => {
  const out: CleanSpeedRow[] = [];
  files.forEach((file) => {
    file.drivers.forEach((driver) => {
      const rank = driver.events.length;
      const vid = sanitize(driver.vid);
      const driversData = resolveDriver ? resolveDriver(vid) : '';
      driver.events.forEach((event) => {
        const row: CleanSpeedRow = {
          Transporter: sanitize(driver.driverName),
          VID: vid,
          'Drivers Data': driversData,
          Period: sanitize(driver.period),
          Start: sanitize(event.start),
          End: sanitize(event.end),
          Duration: sanitize(event.duration),
          'Top Speed': sanitize(event.topSpeed),
          'Overspeed Position': sanitize(event.overspeedPosition),
          Rank: rank,
        };
        if (isUsable(row)) out.push(row);
      });
    });
  });
  // Sort by rank descending — worst offenders at the top of the CSV.
  return out.sort((a, b) => b.Rank - a.Rank);
};

export const downloadCleanCsv = (
  files: UnfilteredFile[],
  resolveDriver?: DriverNameLookup,
  filename = `fleetwatch-speed-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const rows = buildCleanRows(files, resolveDriver);
  const ws = XLSX.utils.json_to_sheet(rows, { header: SPEED_COLUMNS as string[] });
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
