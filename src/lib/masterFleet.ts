import * as XLSX from 'xlsx';
import type {
  UnfilteredContinuousFile,
  UnfilteredFile,
  UnfilteredNightFile,
} from '../types';
import { buildDriverLookup, type DriverNameLookup } from './driverLookup';
import type { DriverRecord } from '../types';
import {
  CONTINUOUS_MIN_SECONDS,
  NIGHTS_MIN_SECONDS,
  SPEED_MIN_SECONDS,
  parseDurationSeconds,
} from './duration';
import {
  blobHasAllowedTag,
  buildAllowedTagSet,
  buildAllowedVidSet,
  normalizeVid,
} from './locationRules';

export interface MasterFleetRow {
  vid: string;
  driverName: string;
  speed: number;
  nights: number;
  continuous: number;
  total: number;
  /** VID appears in the boss's allowed list. */
  allowedVid: boolean;
  /** Speed events that were counted despite occurring in an allowed location. */
  speedInAllowedLocations: number;
}

export interface FilteredSpeedEvent {
  id: string;
  vid: string;
  driverName: string;
  period: string;
  start: string;
  end: string;
  duration: string;
  durationSeconds: number;
  topSpeed: string;
  overspeedPosition: string;
  allowedVid: boolean;
  allowedLocation: boolean;
}

export interface FilteredNightAndContFlags {
  allowedVid: boolean;
}

export interface FilteredNightEvent {
  id: string;
  vid: string;
  driverName: string;
  period: string;
  timeA: string;
  timeB: string;
  duration: string;
  durationSeconds: number;
  length: string;
  allowedVid: boolean;
}

export interface FilteredContinuousEvent {
  id: string;
  vid: string;
  driverName: string;
  period: string;
  timeA: string;
  timeB: string;
  duration: string;
  durationSeconds: number;
  length: string;
  allowedVid: boolean;
}

export interface FilteredEvents {
  speed: FilteredSpeedEvent[];
  nights: FilteredNightEvent[];
  continuous: FilteredContinuousEvent[];
}

export interface EventThresholds {
  speed: number;
  nights: number;
  continuous: number;
}

export const DEFAULT_THRESHOLDS: EventThresholds = {
  speed: SPEED_MIN_SECONDS,
  nights: NIGHTS_MIN_SECONDS,
  continuous: CONTINUOUS_MIN_SECONDS,
};

const normalizeVidKey = (vid: string): string => normalizeVid(vid);

const cleanVidDisplay = (vid: string): string => String(vid ?? '').trim();

interface AggregateInput {
  speedFiles: UnfilteredFile[];
  nightFiles: UnfilteredNightFile[];
  continuousFiles: UnfilteredContinuousFile[];
  driverRecords: DriverRecord[];
  thresholds?: EventThresholds;
  allowedVids?: string[];
  allowedLocations?: string[];
}

interface Bucket {
  vid: string;
  vidKey: string;
  fallbackName: string;
  speed: number;
  nights: number;
  continuous: number;
  speedInAllowedLocations: number;
}

const getBucket = (
  buckets: Map<string, Bucket>,
  vid: string,
  fallbackName: string,
): Bucket | null => {
  const vidKey = normalizeVidKey(vid);
  if (!vidKey) return null;
  let b = buckets.get(vidKey);
  if (!b) {
    b = {
      vid: cleanVidDisplay(vid),
      vidKey,
      fallbackName: '',
      speed: 0,
      nights: 0,
      continuous: 0,
      speedInAllowedLocations: 0,
    };
    buckets.set(vidKey, b);
  }
  if (!b.fallbackName && fallbackName) b.fallbackName = fallbackName;
  return b;
};

export const aggregateMasterFleet = ({
  speedFiles,
  nightFiles,
  continuousFiles,
  driverRecords,
  thresholds = DEFAULT_THRESHOLDS,
  allowedVids = [],
  allowedLocations = [],
}: AggregateInput): MasterFleetRow[] => {
  const resolve: DriverNameLookup = buildDriverLookup(driverRecords);
  const buckets = new Map<string, Bucket>();
  const allowedVidSet = buildAllowedVidSet(allowedVids);
  const allowedTagSet = buildAllowedTagSet(allowedLocations);

  speedFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const b = getBucket(buckets, driver.vid, driver.driverName);
      if (!b) return;
      driver.events.forEach((event) => {
        const seconds = parseDurationSeconds(event.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.speed) {
          b.speed += 1;
          if (
            allowedTagSet.size > 0 &&
            blobHasAllowedTag(event.overspeedPosition, allowedTagSet)
          ) {
            b.speedInAllowedLocations += 1;
          }
        }
      });
    });
  });

  nightFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const b = getBucket(buckets, driver.vid, driver.driverName);
      if (!b) return;
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.nights) {
          b.nights += 1;
        }
      });
    });
  });

  continuousFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const b = getBucket(buckets, driver.vid, driver.driverName);
      if (!b) return;
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.continuous) {
          b.continuous += 1;
        }
      });
    });
  });

  const rows: MasterFleetRow[] = [];
  buckets.forEach((b) => {
    const total = b.speed + b.nights + b.continuous;
    if (total === 0) return;
    rows.push({
      vid: b.vid,
      driverName: resolve(b.vid) || b.fallbackName || '',
      speed: b.speed,
      nights: b.nights,
      continuous: b.continuous,
      total,
      allowedVid: allowedVidSet.has(b.vidKey),
      speedInAllowedLocations: b.speedInAllowedLocations,
    });
  });

  return rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.vid.localeCompare(b.vid);
  });
};

export const collectFilteredEvents = ({
  speedFiles,
  nightFiles,
  continuousFiles,
  driverRecords,
  thresholds = DEFAULT_THRESHOLDS,
  allowedVids = [],
  allowedLocations = [],
}: AggregateInput): FilteredEvents => {
  const resolve = buildDriverLookup(driverRecords);
  const allowedVidSet = buildAllowedVidSet(allowedVids);
  const allowedTagSet = buildAllowedTagSet(allowedLocations);
  const isAllowedVid = (vid: string): boolean =>
    allowedVidSet.size > 0 && allowedVidSet.has(normalizeVid(vid));
  const speed: FilteredSpeedEvent[] = [];
  const nights: FilteredNightEvent[] = [];
  const continuous: FilteredContinuousEvent[] = [];

  speedFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const driverName = resolve(vid) || driver.driverName;
      const allowedVid = isAllowedVid(vid);
      driver.events.forEach((event) => {
        const seconds = parseDurationSeconds(event.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.speed) {
          speed.push({
            id: event.id,
            vid,
            driverName,
            period: driver.period,
            start: event.start,
            end: event.end,
            duration: event.duration,
            durationSeconds: seconds,
            topSpeed: event.topSpeed,
            overspeedPosition: event.overspeedPosition,
            allowedVid,
            allowedLocation:
              allowedTagSet.size > 0 &&
              blobHasAllowedTag(event.overspeedPosition, allowedTagSet),
          });
        }
      });
    });
  });

  nightFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const driverName = resolve(vid) || driver.driverName;
      const allowedVid = isAllowedVid(vid);
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.nights) {
          nights.push({
            id: row.id,
            vid,
            driverName,
            period: driver.period,
            timeA: row.timeA,
            timeB: row.timeB,
            duration: row.duration,
            durationSeconds: seconds,
            length: row.length,
            allowedVid,
          });
        }
      });
    });
  });

  continuousFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const driverName = resolve(vid) || driver.driverName;
      const allowedVid = isAllowedVid(vid);
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.continuous) {
          continuous.push({
            id: row.id,
            vid,
            driverName,
            period: driver.period,
            timeA: row.timeA,
            timeB: row.timeB,
            duration: row.duration,
            durationSeconds: seconds,
            length: row.length,
            allowedVid,
          });
        }
      });
    });
  });

  const byDurationDesc = <T extends { durationSeconds: number }>(a: T, b: T) =>
    b.durationSeconds - a.durationSeconds;
  speed.sort(byDurationDesc);
  nights.sort(byDurationDesc);
  continuous.sort(byDurationDesc);

  return { speed, nights, continuous };
};

const MASTER_COLUMNS = [
  'VID',
  'Driver Name',
  'Nights',
  'Speed',
  'Continuous',
  'Total',
  'Allowed VID',
  'Speed in Allowed Zones',
] as const;

interface SheetRow {
  VID: string;
  'Driver Name': string;
  Nights: number;
  Speed: number;
  Continuous: number;
  Total: number;
  'Allowed VID': string;
  'Speed in Allowed Zones': number;
}

export const downloadMasterFleetCsv = (
  rows: MasterFleetRow[],
  filename = `fleetwatch-master-fleet-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const sheetRows: SheetRow[] = rows.map((r) => ({
    VID: r.vid,
    'Driver Name': r.driverName,
    Nights: r.nights,
    Speed: r.speed,
    Continuous: r.continuous,
    Total: r.total,
    'Allowed VID': r.allowedVid ? 'YES' : '',
    'Speed in Allowed Zones': r.speedInAllowedLocations,
  }));
  const ws = XLSX.utils.json_to_sheet(sheetRows, {
    header: MASTER_COLUMNS as unknown as string[],
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
