import * as XLSX from 'xlsx';
import type { ContinuousSource, UnfilteredFile } from '../types';
import {
  NOT_FOUND,
  type DriverNameLookup,
  type DriverProfileLookup,
} from './driverLookup';

interface CleanSpeedRow {
  Transporter: string;
  VID: string;
  'Driver Name': string;
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
  'Driver Name',
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
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
): CleanSpeedRow[] => {
  const out: CleanSpeedRow[] = [];
  files.forEach((file) => {
    file.drivers.forEach((driver) => {
      const rank = driver.events.length;
      const vid = sanitize(driver.vid);
      const profile = toProfile(resolveProfile, vid);
      const driverName = sanitize(profile.driverName) || NOT_FOUND;
      const transporter =
        sanitize(profile.transporter) ||
        sanitize(driver.transporter || driver.driverName);
      driver.events.forEach((event) => {
        const row: CleanSpeedRow = {
          Transporter: transporter,
          VID: vid,
          'Driver Name': driverName,
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

/** Accept either lookup shape so existing callers don't have to migrate. */
const toProfile = (
  lookup: DriverProfileLookup | DriverNameLookup | undefined,
  vid: string,
): { driverName: string; transporter: string } => {
  if (!lookup) return { driverName: '', transporter: '' };
  const result = lookup(vid);
  if (typeof result === 'string') return { driverName: result, transporter: '' };
  return result;
};

export const downloadCleanCsv = (
  files: UnfilteredFile[],
  resolveProfile?: DriverProfileLookup | DriverNameLookup,
  filename = `fleetwatch-speed-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const rows = buildCleanRows(files, resolveProfile);
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

/* ─── Master combined speed export ──────────────────────────────────────────
 * One row per overspeed event across every uploaded file (Mela + Global
 * unified). Drops End time and Period. For Mela rows, `Coordinates` mirrors
 * `Overspeed position` since Mela has no separate coord column. `Repeated`
 * counts every event seen for that VID across all files.
 */
interface MasterSpeedRow {
  VID: string;
  'Driver Name': string;
  Plate: string;
  Transporter: string;
  Source: ContinuousSource;
  Start: string;
  Duration: string;
  'Max Speed': string;
  Location: string;
  Coordinates: string;
  Repeated: number;
}

const MASTER_SPEED_COLUMNS: (keyof MasterSpeedRow)[] = [
  'VID',
  'Driver Name',
  'Plate',
  'Transporter',
  'Source',
  'Start',
  'Duration',
  'Max Speed',
  'Location',
  'Coordinates',
  'Repeated',
];

const vidKey = (vid: string): string =>
  sanitize(vid).toUpperCase().replace(/\s+/g, '');

export const buildMasterSpeedRows = (
  files: UnfilteredFile[],
  resolveProfile?: DriverProfileLookup,
): MasterSpeedRow[] => {
  const counts = new Map<string, number>();
  files.forEach((file) =>
    file.drivers.forEach((d) => {
      const key = vidKey(d.vid);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + d.events.length);
    }),
  );

  const out: MasterSpeedRow[] = [];
  files.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = sanitize(driver.vid);
      const plate = sanitize(driver.plate ?? '');
      const source: ContinuousSource = driver.source ?? 'mela';
      const profile = resolveProfile
        ? resolveProfile(vid)
        : { driverName: '', transporter: '' };
      // Boss's Drivers Data upload is the source of truth. Falls back to the
      // export's own transporter cell (Global `Owner` / Mela `Group`) so we
      // never emit an empty transporter when the boss list is missing.
      const transporter =
        sanitize(profile.transporter) ||
        sanitize(driver.transporter || driver.driverName);
      const driverName = sanitize(profile.driverName) || NOT_FOUND;
      const repeated = counts.get(vidKey(vid)) ?? driver.events.length;

      driver.events.forEach((event) => {
        const start = sanitize(event.start);
        const maxSpeed = sanitize(event.topSpeed);
        const overspeed = sanitize(event.overspeedPosition);
        // Global has a dedicated Location + Coordinates column; Mela reuses
        // Overspeed position for both.
        const location = sanitize(event.location) || overspeed;
        const coordinates = sanitize(event.gpsCoords) || overspeed;
        if (!vid && !plate) return;
        if (!start && !maxSpeed && !location) return;
        out.push({
          VID: vid,
          'Driver Name': driverName,
          Plate: plate,
          Transporter: transporter,
          Source: source,
          Start: start,
          Duration: sanitize(event.duration),
          'Max Speed': maxSpeed,
          Location: location,
          Coordinates: coordinates,
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

export const downloadMasterSpeedCsv = (
  files: UnfilteredFile[],
  resolveProfile?: DriverProfileLookup,
  filename = `fleetwatch-speed-master-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const rows = buildMasterSpeedRows(files, resolveProfile);
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: MASTER_SPEED_COLUMNS as string[],
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
