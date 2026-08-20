import * as XLSX from 'xlsx';
import type {
  UnfilteredContinuousFile,
  UnfilteredFile,
  UnfilteredNightFile,
} from '../types';
import {
  buildDriverProfileLookup,
  NOT_FOUND,
  type DriverProfileLookup,
} from './driverLookup';
import type { DriverRecord } from '../types';
import type {
  AllowedLocationLists,
  AllowedVidLists,
} from '../features/rules/rulesSlice';
import {
  CONTINUOUS_MIN_SECONDS,
  NIGHTS_MIN_SECONDS,
  SPEED_MIN_SECONDS,
  parseDurationSeconds,
} from './duration';
import {
  buildAllowedTagMatcher,
  buildAllowedVidMatcher,
  eventDateKey,
  normalizeVid,
} from './locationRules';

const EMPTY_ALLOWED: AllowedVidLists = {
  speed: [],
  nights: [],
  continuous: [],
};

const EMPTY_ALLOWED_LOCATIONS: AllowedLocationLists = {
  speed: [],
  nights: [],
  continuous: [],
};

export interface MasterFleetRow {
  vid: string;
  driverName: string;
  transporter: string;
  speed: number;
  nights: number;
  continuous: number;
  total: number;
  /** VID appears in the boss's allowed list. */
  allowedVid: boolean;
  /** Speed events excluded because their position matched an allowed
   *  location tag (Speed-only reporting; the count is already subtracted
   *  from `speed`). */
  speedInAllowedLocations: number;
}

export interface FilteredSpeedEvent {
  id: string;
  vid: string;
  driverName: string;
  transporter: string;
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
  transporter: string;
  period: string;
  timeA: string;
  timeB: string;
  duration: string;
  durationSeconds: number;
  length: string;
  /** Preferred display position (Position A → falls back to Position B). */
  position: string;
  positionA: string;
  positionB: string;
  allowedVid: boolean;
  allowedLocation: boolean;
}

export interface FilteredContinuousEvent {
  id: string;
  vid: string;
  driverName: string;
  transporter: string;
  period: string;
  timeA: string;
  timeB: string;
  duration: string;
  durationSeconds: number;
  length: string;
  /** Preferred display position (Position B → falls back to Position A). */
  position: string;
  positionA: string;
  positionB: string;
  allowedVid: boolean;
  allowedLocation: boolean;
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
  /** Per-category VID whitelists. A VID in a category is excluded from that
   *  category's counts (a VID whitelisted only for Speed still contributes
   *  to Nights and Continuous). */
  allowedVidsByType?: AllowedVidLists;
  /** Per-category location-tag whitelists. An event whose position matches
   *  a tag in its category is excluded from that category's counts. */
  allowedLocationsByType?: AllowedLocationLists;
}

interface Bucket {
  vid: string;
  vidKey: string;
  fallbackName: string;
  fallbackTransporter: string;
  speed: number;
  nights: number;
  continuous: number;
  speedInAllowedLocations: number;
}

const getBucket = (
  buckets: Map<string, Bucket>,
  vid: string,
  fallbackName: string,
  fallbackTransporter: string,
): Bucket | null => {
  const vidKey = normalizeVidKey(vid);
  if (!vidKey) return null;
  let b = buckets.get(vidKey);
  if (!b) {
    b = {
      vid: cleanVidDisplay(vid),
      vidKey,
      fallbackName: '',
      fallbackTransporter: '',
      speed: 0,
      nights: 0,
      continuous: 0,
      speedInAllowedLocations: 0,
    };
    buckets.set(vidKey, b);
  }
  if (!b.fallbackName && fallbackName) b.fallbackName = fallbackName;
  if (!b.fallbackTransporter && fallbackTransporter)
    b.fallbackTransporter = fallbackTransporter;
  return b;
};

const sourceTransporter = (driver: {
  transporter?: string;
  driverName?: string;
}): string => driver.transporter || driver.driverName || '';

export const aggregateMasterFleet = ({
  speedFiles,
  nightFiles,
  continuousFiles,
  driverRecords,
  thresholds = DEFAULT_THRESHOLDS,
  allowedVidsByType = EMPTY_ALLOWED,
  allowedLocationsByType = EMPTY_ALLOWED_LOCATIONS,
}: AggregateInput): MasterFleetRow[] => {
  const resolve: DriverProfileLookup = buildDriverProfileLookup(driverRecords);
  const buckets = new Map<string, Bucket>();
  const allowedSpeed = buildAllowedVidMatcher(allowedVidsByType.speed);
  const allowedNights = buildAllowedVidMatcher(allowedVidsByType.nights);
  const allowedCont = buildAllowedVidMatcher(allowedVidsByType.continuous);
  const speedTags = buildAllowedTagMatcher(allowedLocationsByType.speed);
  const nightsTags = buildAllowedTagMatcher(allowedLocationsByType.nights);
  const contTags = buildAllowedTagMatcher(allowedLocationsByType.continuous);

  speedFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const b = getBucket(
        buckets,
        driver.vid,
        driver.driverName,
        sourceTransporter(driver),
      );
      if (!b) return;
      driver.events.forEach((event) => {
        const seconds = parseDurationSeconds(event.duration);
        if (!Number.isFinite(seconds) || seconds < thresholds.speed) return;
        const evtKey = eventDateKey(event.start, event.end);
        if (allowedSpeed.matches(b.vidKey, evtKey)) return;
        if (speedTags.matchesBlob(event.overspeedPosition, evtKey)) {
          b.speedInAllowedLocations += 1;
          return;
        }
        b.speed += 1;
      });
    });
  });

  nightFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const b = getBucket(
        buckets,
        driver.vid,
        driver.driverName,
        sourceTransporter(driver),
      );
      if (!b) return;
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (!Number.isFinite(seconds) || seconds < thresholds.nights) return;
        const evtKey = eventDateKey(row.timeA, row.timeB);
        if (allowedNights.matches(b.vidKey, evtKey)) return;
        if (
          nightsTags.matchesPosition(row.positionA, evtKey) ||
          nightsTags.matchesPosition(row.positionB, evtKey)
        ) {
          return;
        }
        b.nights += 1;
      });
    });
  });

  continuousFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const b = getBucket(
        buckets,
        driver.vid,
        driver.driverName,
        sourceTransporter(driver),
      );
      if (!b) return;
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (!Number.isFinite(seconds) || seconds < thresholds.continuous) return;
        const evtKey = eventDateKey(row.timeA, row.timeB);
        if (allowedCont.matches(b.vidKey, evtKey)) return;
        if (
          contTags.matchesPosition(row.positionA, evtKey) ||
          contTags.matchesPosition(row.positionB, evtKey)
        ) {
          return;
        }
        b.continuous += 1;
      });
    });
  });

  const rows: MasterFleetRow[] = [];
  buckets.forEach((b) => {
    const total = b.speed + b.nights + b.continuous;
    if (total === 0) return;
    const profile = resolve(b.vid);
    // The row-level `allowedVid` flag is a UI badge only — we mark it true
    // whenever the VID appears in any category's whitelist, regardless of
    // per-day scope, so the boss can see "this VID has some allowance."
    const isAllowed =
      allowedVidsByType.speed.some(
        (e) => normalizeVid(e.vid) === b.vidKey,
      ) ||
      allowedVidsByType.nights.some(
        (e) => normalizeVid(e.vid) === b.vidKey,
      ) ||
      allowedVidsByType.continuous.some(
        (e) => normalizeVid(e.vid) === b.vidKey,
      );
    rows.push({
      vid: b.vid,
      driverName: profile.driverName || NOT_FOUND,
      transporter: profile.transporter || b.fallbackTransporter || '',
      speed: b.speed,
      nights: b.nights,
      continuous: b.continuous,
      total,
      allowedVid: isAllowed,
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
  allowedVidsByType = EMPTY_ALLOWED,
  allowedLocationsByType = EMPTY_ALLOWED_LOCATIONS,
}: AggregateInput): FilteredEvents => {
  const resolve = buildDriverProfileLookup(driverRecords);
  const allowedSpeed = buildAllowedVidMatcher(allowedVidsByType.speed);
  const allowedNights = buildAllowedVidMatcher(allowedVidsByType.nights);
  const allowedCont = buildAllowedVidMatcher(allowedVidsByType.continuous);
  const speedTags = buildAllowedTagMatcher(allowedLocationsByType.speed);
  const nightsTags = buildAllowedTagMatcher(allowedLocationsByType.nights);
  const contTags = buildAllowedTagMatcher(allowedLocationsByType.continuous);
  const speed: FilteredSpeedEvent[] = [];
  const nights: FilteredNightEvent[] = [];
  const continuous: FilteredContinuousEvent[] = [];

  speedFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const vidKey = normalizeVid(vid);
      const profile = resolve(vid);
      const driverName = profile.driverName || NOT_FOUND;
      const transporter = profile.transporter || sourceTransporter(driver);
      driver.events.forEach((event) => {
        const seconds = parseDurationSeconds(event.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.speed) {
          const evtKey = eventDateKey(event.start, event.end);
          speed.push({
            id: event.id,
            vid,
            driverName,
            transporter,
            period: driver.period,
            start: event.start,
            end: event.end,
            duration: event.duration,
            durationSeconds: seconds,
            topSpeed: event.topSpeed,
            overspeedPosition: event.overspeedPosition,
            allowedVid: allowedSpeed.matches(vidKey, evtKey),
            allowedLocation: speedTags.matchesBlob(
              event.overspeedPosition,
              evtKey,
            ),
          });
        }
      });
    });
  });

  nightFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const vidKey = normalizeVid(vid);
      const profile = resolve(vid);
      const driverName = profile.driverName || NOT_FOUND;
      const transporter = profile.transporter || sourceTransporter(driver);
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.nights) {
          const evtKey = eventDateKey(row.timeA, row.timeB);
          const position = row.positionA || row.positionB || '';
          const allowedLocation =
            nightsTags.matchesPosition(row.positionA, evtKey) ||
            nightsTags.matchesPosition(row.positionB, evtKey);
          nights.push({
            id: row.id,
            vid,
            driverName,
            transporter,
            period: driver.period,
            timeA: row.timeA,
            timeB: row.timeB,
            duration: row.duration,
            durationSeconds: seconds,
            length: row.length,
            position,
            positionA: row.positionA,
            positionB: row.positionB,
            allowedVid: allowedNights.matches(vidKey, evtKey),
            allowedLocation,
          });
        }
      });
    });
  });

  continuousFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const vidKey = normalizeVid(vid);
      const profile = resolve(vid);
      const driverName = profile.driverName || NOT_FOUND;
      const transporter = profile.transporter || sourceTransporter(driver);
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (Number.isFinite(seconds) && seconds >= thresholds.continuous) {
          const evtKey = eventDateKey(row.timeA, row.timeB);
          const position = row.positionB || row.positionA || '';
          const allowedLocation =
            contTags.matchesPosition(row.positionB, evtKey) ||
            contTags.matchesPosition(row.positionA, evtKey);
          continuous.push({
            id: row.id,
            vid,
            driverName,
            transporter,
            period: driver.period,
            timeA: row.timeA,
            timeB: row.timeB,
            duration: row.duration,
            durationSeconds: seconds,
            length: row.length,
            position,
            positionA: row.positionA,
            positionB: row.positionB,
            allowedVid: allowedCont.matches(vidKey, evtKey),
            allowedLocation,
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
  'Transporter',
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
  Transporter: string;
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
    'Driver Name': r.driverName || NOT_FOUND,
    Transporter: r.transporter,
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
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
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

const triggerCsvDownload = (csv: string, filename: string) => {
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export const downloadFilteredSpeedCsv = (
  rows: FilteredSpeedEvent[],
  filename = `fleetwatch-filtered-speed-${new Date().toISOString().slice(0, 10)}.csv`,
): void => {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((e) => ({
      VID: e.vid,
      'Driver Name': e.driverName,
      Transporter: e.transporter,
      Period: e.period,
      Start: e.start,
      End: e.end,
      Duration: e.duration,
      'Top Speed': e.topSpeed,
      'Overspeed Position': e.overspeedPosition,
      'Allowed VID': e.allowedVid ? 'YES' : '',
      'Allowed Location': e.allowedLocation ? 'YES' : '',
    })),
    {
      header: [
        'VID', 'Driver Name', 'Transporter', 'Period',
        'Start', 'End', 'Duration', 'Top Speed',
        'Overspeed Position', 'Allowed VID', 'Allowed Location',
      ],
    },
  );
  triggerCsvDownload(XLSX.utils.sheet_to_csv(ws), filename);
};

export const downloadFilteredNightsCsv = (
  rows: FilteredNightEvent[],
  filename = `fleetwatch-filtered-nights-${new Date().toISOString().slice(0, 10)}.csv`,
): void => {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((e) => ({
      VID: e.vid,
      'Driver Name': e.driverName,
      Transporter: e.transporter,
      Period: e.period,
      'Time A': e.timeA,
      'Time B': e.timeB,
      Duration: e.duration,
      Position: e.position,
      'Allowed VID': e.allowedVid ? 'YES' : '',
      'Allowed Location': e.allowedLocation ? 'YES' : '',
    })),
    {
      header: [
        'VID', 'Driver Name', 'Transporter', 'Period',
        'Time A', 'Time B', 'Duration', 'Position',
        'Allowed VID', 'Allowed Location',
      ],
    },
  );
  triggerCsvDownload(XLSX.utils.sheet_to_csv(ws), filename);
};

export const downloadFilteredContinuousCsv = (
  rows: FilteredContinuousEvent[],
  filename = `fleetwatch-filtered-continuous-${new Date().toISOString().slice(0, 10)}.csv`,
): void => {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((e) => ({
      VID: e.vid,
      'Driver Name': e.driverName,
      Transporter: e.transporter,
      Period: e.period,
      'Time A': e.timeA,
      'Time B': e.timeB,
      Duration: e.duration,
      Length: e.length,
      Position: e.position,
      'Allowed VID': e.allowedVid ? 'YES' : '',
      'Allowed Location': e.allowedLocation ? 'YES' : '',
    })),
    {
      header: [
        'VID', 'Driver Name', 'Transporter', 'Period',
        'Time A', 'Time B', 'Duration', 'Length', 'Position',
        'Allowed VID', 'Allowed Location',
      ],
    },
  );
  triggerCsvDownload(XLSX.utils.sheet_to_csv(ws), filename);
};

