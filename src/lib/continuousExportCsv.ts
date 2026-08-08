import * as XLSX from 'xlsx';
import type { ContinuousSource, UnfilteredContinuousFile } from '../types';
import {
  NOT_FOUND,
  type DriverNameLookup,
  type DriverProfileLookup,
} from './driverLookup';

interface CleanContinuousRow {
  Transporter: string;
  VID: string;
  'Driver Name': string;
  Plate: string;
  Source: ContinuousSource;
  Period: string;
  'Time A': string;
  'Location A': string;
  'Time B': string;
  'Location B': string;
  Duration: string;
  Length: string;
  Rank: number;
}

const COLUMNS: (keyof CleanContinuousRow)[] = [
  'Transporter',
  'VID',
  'Driver Name',
  'Plate',
  'Source',
  'Period',
  'Time A',
  'Location A',
  'Time B',
  'Location B',
  'Duration',
  'Length',
  'Rank',
];

const toProfile = (
  lookup: DriverProfileLookup | DriverNameLookup | undefined,
  vid: string,
): { driverName: string; transporter: string } => {
  if (!lookup) return { driverName: '', transporter: '' };
  const result = lookup(vid);
  if (typeof result === 'string') return { driverName: result, transporter: '' };
  return result;
};

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
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
): CleanContinuousRow[] => {
  const out: CleanContinuousRow[] = [];
  files.forEach((file) => {
    file.drivers.forEach((driver) => {
      const rank = driver.rows.length;
      const vid = sanitize(driver.vid);
      const profile = toProfile(resolveProfile, vid);
      const driverName = sanitize(profile.driverName) || NOT_FOUND;
      const transporter =
        sanitize(profile.transporter) ||
        sanitize(driver.transporter || driver.driverName);
      driver.rows.forEach((r) => {
        const row: CleanContinuousRow = {
          Transporter: transporter,
          VID: vid,
          'Driver Name': driverName,
          Plate: sanitize(driver.plate ?? ''),
          Source: driver.source ?? 'mela',
          Period: sanitize(driver.period),
          'Time A': sanitize(r.timeA),
          'Location A': sanitize(r.positionA),
          'Time B': sanitize(r.timeB),
          'Location B': sanitize(r.positionB),
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
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
  filename = `fleetwatch-continuous-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const rows = buildCleanContinuousRows(files, resolveProfile);
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

/* ─── Master combined export ────────────────────────────────────────────────
 * One row per trip across *all* uploaded files (Mela + Global unified).
 * Only Location B is emitted — the master sheet treats the trip's end point
 * as the canonical location. `Repeated` = total trips seen for that VID
 * across every uploaded file (so bosses can rank hot vehicles instantly).
 */
interface MasterContinuousRow {
  VID: string;
  'Driver Name': string;
  Plate: string;
  Transporter: string;
  Source: ContinuousSource;
  Period: string;
  'Time A': string;
  'Time B': string;
  Location: string;
  Duration: string;
  Length: string;
  Repeated: number;
}

const MASTER_COLUMNS: (keyof MasterContinuousRow)[] = [
  'VID',
  'Driver Name',
  'Plate',
  'Transporter',
  'Source',
  'Period',
  'Time A',
  'Time B',
  'Location',
  'Duration',
  'Length',
  'Repeated',
];

const vidKey = (vid: string): string =>
  sanitize(vid).toUpperCase().replace(/\s+/g, '');

export const buildMasterContinuousRows = (
  files: UnfilteredContinuousFile[],
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
): MasterContinuousRow[] => {
  const counts = new Map<string, number>();
  files.forEach((file) =>
    file.drivers.forEach((d) => {
      const key = vidKey(d.vid);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + d.rows.length);
    }),
  );

  const out: MasterContinuousRow[] = [];
  files.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = sanitize(driver.vid);
      const repeated = counts.get(vidKey(vid)) ?? driver.rows.length;
      const profile = toProfile(resolveProfile, vid);
      const driverName = sanitize(profile.driverName) || NOT_FOUND;
      // Prefer the boss list's transporter; fall back to whatever the source
      // spreadsheet put on the block (Global `Owner` / Mela `Group`).
      const transporter =
        sanitize(profile.transporter) ||
        sanitize(driver.transporter || driver.driverName);
      const plate = sanitize(driver.plate ?? '');
      const source: ContinuousSource = driver.source ?? 'mela';
      driver.rows.forEach((r) => {
        const timeA = sanitize(r.timeA);
        const timeB = sanitize(r.timeB);
        const location = sanitize(r.positionB);
        if (!vid && !plate) return;
        if (!timeA && !timeB && !location) return;
        out.push({
          VID: vid,
          'Driver Name': driverName,
          Plate: plate,
          Transporter: transporter,
          Source: source,
          Period: sanitize(driver.period),
          'Time A': timeA,
          'Time B': timeB,
          Location: location,
          Duration: sanitize(r.duration),
          Length: sanitize(r.length),
          Repeated: repeated,
        });
      });
    });
  });

  return out.sort((a, b) => {
    if (b.Repeated !== a.Repeated) return b.Repeated - a.Repeated;
    return a.VID.localeCompare(b.VID);
  });
};

export const downloadMasterContinuousCsv = (
  files: UnfilteredContinuousFile[],
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
  filename = `fleetwatch-continuous-master-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const rows = buildMasterContinuousRows(files, resolveProfile);
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: MASTER_COLUMNS as string[],
  });
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
