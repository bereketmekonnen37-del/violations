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

export interface MasterFleetRow {
  vid: string;
  driverName: string;
  speed: number;
  nights: number;
  continuous: number;
  total: number;
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

const normalizeVidKey = (vid: string): string =>
  String(vid ?? '').replace(/[^0-9a-zA-Z]+/g, '').toLowerCase();

const cleanVidDisplay = (vid: string): string => String(vid ?? '').trim();

interface AggregateInput {
  speedFiles: UnfilteredFile[];
  nightFiles: UnfilteredNightFile[];
  continuousFiles: UnfilteredContinuousFile[];
  driverRecords: DriverRecord[];
  thresholds?: EventThresholds;
}

interface Bucket {
  vid: string;
  vidKey: string;
  fallbackName: string;
  speed: number;
  nights: number;
  continuous: number;
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
}: AggregateInput): MasterFleetRow[] => {
  const resolve: DriverNameLookup = buildDriverLookup(driverRecords);
  const buckets = new Map<string, Bucket>();

  speedFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const b = getBucket(buckets, driver.vid, driver.driverName);
      if (!b) return;
      driver.events.forEach((event) => {
        const seconds = parseDurationSeconds(event.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.speed) {
          b.speed += 1;
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
}: AggregateInput): FilteredEvents => {
  const resolve = buildDriverLookup(driverRecords);
  const speed: FilteredSpeedEvent[] = [];
  const nights: FilteredNightEvent[] = [];
  const continuous: FilteredContinuousEvent[] = [];

  speedFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const driverName = resolve(vid) || driver.driverName;
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
          });
        }
      });
    });
  });

  nightFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const driverName = resolve(vid) || driver.driverName;
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
          });
        }
      });
    });
  });

  continuousFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const driverName = resolve(vid) || driver.driverName;
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
] as const;

interface SheetRow {
  VID: string;
  'Driver Name': string;
  Nights: number;
  Speed: number;
  Continuous: number;
  Total: number;
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
