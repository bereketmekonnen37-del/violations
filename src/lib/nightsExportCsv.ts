import * as XLSX from 'xlsx';
import type { ContinuousSource, UnfilteredNightFile } from '../types';
import {
  NOT_FOUND,
  type DriverNameLookup,
  type DriverProfileLookup,
} from './driverLookup';

interface CleanNightRow {
  Transporter: string;
  VID: string;
  'Driver Name': string;
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
  'Driver Name',
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

const toProfile = (
  lookup: DriverProfileLookup | DriverNameLookup | undefined,
  vid: string,
): { driverName: string; transporter: string } => {
  if (!lookup) return { driverName: '', transporter: '' };
  const result = lookup(vid);
  if (typeof result === 'string') return { driverName: result, transporter: '' };
  return result;
};

export const buildCleanNightRows = (
  files: UnfilteredNightFile[],
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
): CleanNightRow[] => {
  const out: CleanNightRow[] = [];
  files.forEach((file) => {
    file.drivers.forEach((driver) => {
      const rank = driver.rows.length;
      const vid = sanitize(driver.vid);
      const profile = toProfile(resolveProfile, vid);
      const driverName = sanitize(profile.driverName) || NOT_FOUND;
      const transporter =
        sanitize(profile.transporter) ||
        sanitize(driver.transporter || driver.driverName);
      driver.rows.forEach((nr) => {
        const row: CleanNightRow = {
          Transporter: transporter,
          VID: vid,
          'Driver Name': driverName,
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
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
  filename = `fleetwatch-nights-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const rows = buildCleanNightRows(files, resolveProfile);
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

/* ─── Master combined nights export ─────────────────────────────────────────
 * One row per night event across every uploaded file (Mela + Global unified).
 * Column mapping:
 *   Time      = "<Start> - <End>" combined into a single cell
 *   Duration  = Mela `Duration` OR Global `Night Duration`
 *   Distance  = Mela `Length`   OR Global `Distance`
 *   Location  = Mela `Position A` OR Global `Start Location` (Position B /
 *               End Location are intentionally dropped)
 * Average Speed / Max Speed columns are dropped (Mela lacks them). End time,
 * Period, and the destination location are all dropped. `Repeated` counts
 * every night event seen for that VID across all uploaded files.
 */
interface MasterNightRow {
  VID: string;
  'Driver Name': string;
  Plate: string;
  Transporter: string;
  Source: ContinuousSource;
  Time: string;
  Duration: string;
  Distance: string;
  Location: string;
  Repeated: number;
}

const MASTER_NIGHT_COLUMNS: (keyof MasterNightRow)[] = [
  'VID',
  'Driver Name',
  'Plate',
  'Transporter',
  'Source',
  'Time',
  'Duration',
  'Distance',
  'Location',
  'Repeated',
];

const vidKey = (vid: string): string =>
  sanitize(vid).toUpperCase().replace(/\s+/g, '');

const joinTime = (start: string, end: string): string => {
  const a = sanitize(start);
  const b = sanitize(end);
  if (a && b) return `${a} - ${b}`;
  return a || b;
};

export const buildMasterNightRows = (
  files: UnfilteredNightFile[],
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
): MasterNightRow[] => {
  const counts = new Map<string, number>();
  files.forEach((file) =>
    file.drivers.forEach((d) => {
      const key = vidKey(d.vid);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + d.rows.length);
    }),
  );

  const out: MasterNightRow[] = [];
  files.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = sanitize(driver.vid);
      const plate = sanitize(driver.plate ?? '');
      const source: ContinuousSource = driver.source ?? 'mela';
      const profile = toProfile(resolveProfile, vid);
      const driverName = sanitize(profile.driverName) || NOT_FOUND;
      const transporter =
        sanitize(profile.transporter) ||
        sanitize(driver.transporter || driver.driverName);
      const repeated = counts.get(vidKey(vid)) ?? driver.rows.length;

      driver.rows.forEach((r) => {
        const time = joinTime(r.timeA, r.timeB);
        const duration = sanitize(r.duration);
        const distance = sanitize(r.length);
        const location = sanitize(r.positionA);
        if (!vid && !plate) return;
        if (!time && !duration && !distance && !location) return;
        out.push({
          VID: vid,
          'Driver Name': driverName,
          Plate: plate,
          Transporter: transporter,
          Source: source,
          Time: time,
          Duration: duration,
          Distance: distance,
          Location: location,
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

export const downloadMasterNightsCsv = (
  files: UnfilteredNightFile[],
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
  filename = `fleetwatch-nights-master-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const rows = buildMasterNightRows(files, resolveProfile);
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: MASTER_NIGHT_COLUMNS as string[],
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
