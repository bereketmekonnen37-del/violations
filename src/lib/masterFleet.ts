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
  UnderestimatedRule,
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
import { mergeNightRows } from './nightsMerger';
import { isUnderestimated } from './underestimated';

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
  /** At least one of this VID's night rows was merged (two or more raw
   *  night events collapsed into one). Drives the "merged" badge in the UI. */
  hasMergedNights: boolean;
  /** Continuous events matching the under-estimated rule — tagged, kept out
   *  of `continuous`, `total` and the ranking. */
  underestimatedContinuous: number;
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
  /** True when Position A specifically contained an allowed-location tag. */
  allowedLocationA: boolean;
  /** True when Position B specifically contained an allowed-location tag. */
  allowedLocationB: boolean;
  /** Number of raw night rows this event represents (1 = not merged). */
  mergedCount: number;
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
  /** True when Position A specifically contained an allowed-location tag. */
  allowedLocationA: boolean;
  /** True when Position B specifically contained an allowed-location tag. */
  allowedLocationB: boolean;
  /** Matches the under-estimated rule: not counted, listed with a tag. */
  underestimated: boolean;
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

export const cleanVidDisplay = (vid: string): string => String(vid ?? '').trim();

export interface AggregateInput {
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
  /** When true (default), consecutive same-night rows are collapsed via
   *  `mergeNightRows` before counting. Driven by the "Nights merged"
   *  toggle — false shows every raw night row uncollapsed. */
  mergeNights?: boolean;
  /** When set (seconds), any event/row whose duration exceeds this is
   *  dropped entirely — from Speed, Nights and Continuous alike. Set on
   *  the Rules page; `null`/`undefined` means no cap. */
  maxDurationSeconds?: number | null;
  /** Continuous under-estimated rule (duration >= X and distance <= Y km).
   *  Matching rows are tagged and excluded from every count/ranking. */
  underestimatedRule?: UnderestimatedRule | null;
}

/** True when a duration cap is set and this event exceeds it. */
export const exceedsMaxDuration = (
  seconds: number,
  maxDurationSeconds: number | null | undefined,
): boolean =>
  maxDurationSeconds != null && maxDurationSeconds > 0 && seconds > maxDurationSeconds;

export interface DurationQualification {
  /** Parsed duration in seconds, or 0 when the row carries no duration. */
  seconds: number;
  /** False when the duration is missing/zero/unparseable ("no duration"). */
  hasDuration: boolean;
}

/**
 * A row with no duration (blank, "0", or unparseable) is never dropped for
 * lacking one — it still counts. A row that DOES have a duration is still
 * subject to the category threshold and the optional max-duration cap,
 * unchanged. This only concerns Master Fleet (this file); Dashboard and
 * Transporter analytics keep dropping zero-duration rows as before.
 */
export const qualifyDuration = (raw: string): DurationQualification => {
  const parsed = parseDurationSeconds(raw);
  const hasDuration = Number.isFinite(parsed) && parsed > 0;
  return { seconds: hasDuration ? parsed : 0, hasDuration };
};

/** True when the category threshold/cap should exclude this row — only
 *  ever applies when the row actually has a duration to check. */
const failsDurationRules = (
  q: DurationQualification,
  threshold: number,
  maxDurationSeconds: number | null | undefined,
): boolean =>
  q.hasDuration &&
  (q.seconds < threshold || exceedsMaxDuration(q.seconds, maxDurationSeconds));

/**
 * Identity used to catch duplicate rows across uploads.
 *
 * The dedup was originally `vid|driver|duration` — which was correct for
 * "the same file was uploaded twice" but silently ate legit second events
 * whenever a driver happened to have two overspeed events of identical
 * duration (or two different uploads covered overlapping periods). We now
 * also fold in the event's start timestamp so two events are only treated
 * as duplicates when they are the same event down to the second. Falls
 * back to the end timestamp when the start is missing.
 */
export const duplicateKey = (
  vidKey: string,
  driverName: string,
  q: DurationQualification,
  startOrTimeA: string,
  endOrTimeB: string = '',
): string => {
  const time = (startOrTimeA ?? '').trim() || (endOrTimeB ?? '').trim();
  return `${vidKey}|${driverName.trim().toLowerCase()}|${q.hasDuration ? q.seconds : 'none'}|${time}`;
};

interface Bucket {
  vid: string;
  vidKey: string;
  fallbackName: string;
  fallbackTransporter: string;
  speed: number;
  nights: number;
  continuous: number;
  speedInAllowedLocations: number;
  hasMergedNights: boolean;
  underestimatedContinuous: number;
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
      hasMergedNights: false,
      underestimatedContinuous: 0,
    };
    buckets.set(vidKey, b);
  }
  if (!b.fallbackName && fallbackName) b.fallbackName = fallbackName;
  if (!b.fallbackTransporter && fallbackTransporter)
    b.fallbackTransporter = fallbackTransporter;
  return b;
};

export const sourceTransporter = (driver: {
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
  mergeNights = true,
  maxDurationSeconds = null,
  underestimatedRule = null,
}: AggregateInput): MasterFleetRow[] => {
  const resolve: DriverProfileLookup = buildDriverProfileLookup(driverRecords);
  const buckets = new Map<string, Bucket>();
  const rosterSeeded = new Set<string>();
  const allowedSpeed = buildAllowedVidMatcher(allowedVidsByType.speed);
  const allowedNights = buildAllowedVidMatcher(allowedVidsByType.nights);
  const allowedCont = buildAllowedVidMatcher(allowedVidsByType.continuous);
  const speedTags = buildAllowedTagMatcher(allowedLocationsByType.speed);
  const nightsTags = buildAllowedTagMatcher(allowedLocationsByType.nights);
  const contTags = buildAllowedTagMatcher(allowedLocationsByType.continuous);
  const seenSpeed = new Set<string>();
  const seenNights = new Set<string>();
  const seenContinuous = new Set<string>();

  // Seed a bucket for every VID the boss uploaded via the Drivers Data
  // roster, so those drivers appear on Master Fleet next to the transporter
  // they were assigned — even if none of the three violation uploads carry a
  // row for them yet. Buckets started this way are tracked so we can keep
  // them in the result even when their totals stay zero (buckets started
  // only by a violation row still need `total > 0` to appear).
  driverRecords.forEach((record) => {
    const b = getBucket(
      buckets,
      record.vid,
      record.driverName,
      record.transporter,
    );
    if (b) rosterSeeded.add(b.vidKey);
  });

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
        const q = qualifyDuration(event.duration);
        if (failsDurationRules(q, thresholds.speed, maxDurationSeconds)) return;
        // Drop rows that carry no position — a duration with nowhere to point
        // at isn't useful on the master sheet.
        if (!(event.overspeedPosition && event.overspeedPosition.trim())) return;
        const evtKey = eventDateKey(event.start, event.end);
        if (allowedSpeed.matches(b.vidKey, evtKey)) return;
        if (speedTags.matchesPosition(event.overspeedPosition, evtKey)) {
          b.speedInAllowedLocations += 1;
          return;
        }
        const dupKey = duplicateKey(
          b.vidKey,
          driver.driverName,
          q,
          event.start,
          event.end,
        );
        if (seenSpeed.has(dupKey)) return;
        seenSpeed.add(dupKey);
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
      // Collapse consecutive same-night rows for this VID into one before
      // applying threshold / whitelist filters (unless the merge toggle is
      // off). `false` keeps rows with no duration instead of dropping them.
      const merged = mergeNightRows(driver.rows, mergeNights, false);
      merged.forEach((row) => {
        const q = qualifyDuration(row.duration);
        if (failsDurationRules(q, thresholds.nights, maxDurationSeconds)) return;
        const evtKey = eventDateKey(row.timeA, row.timeB);
        if (allowedNights.matches(b.vidKey, evtKey)) return;
        if (
          nightsTags.matchesPosition(row.positionA, evtKey) ||
          nightsTags.matchesPosition(row.positionB, evtKey)
        ) {
          return;
        }
        const dupKey = duplicateKey(
          b.vidKey,
          driver.driverName,
          q,
          row.timeA,
          row.timeB,
        );
        if (seenNights.has(dupKey)) return;
        seenNights.add(dupKey);
        b.nights += 1;
        if (row.mergedCount > 1) b.hasMergedNights = true;
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
        const q = qualifyDuration(row.duration);
        if (failsDurationRules(q, thresholds.continuous, maxDurationSeconds)) return;
        // Skip rows with no position on either endpoint.
        const hasPosition =
          Boolean(row.positionA && row.positionA.trim()) ||
          Boolean(row.positionB && row.positionB.trim());
        if (!hasPosition) return;
        const evtKey = eventDateKey(row.timeA, row.timeB);
        if (allowedCont.matches(b.vidKey, evtKey)) return;
        if (
          contTags.matchesPosition(row.positionA, evtKey) ||
          contTags.matchesPosition(row.positionB, evtKey)
        ) {
          return;
        }
        const dupKey = duplicateKey(
          b.vidKey,
          driver.driverName,
          q,
          row.timeA,
          row.timeB,
        );
        if (seenContinuous.has(dupKey)) return;
        seenContinuous.add(dupKey);
        if (isUnderestimated(underestimatedRule, q.seconds, row.length)) {
          b.underestimatedContinuous += 1;
          return;
        }
        b.continuous += 1;
      });
    });
  });

  const rows: MasterFleetRow[] = [];
  buckets.forEach((b) => {
    const total = b.speed + b.nights + b.continuous;
    // Roster-seeded rows are always kept so the boss's uploaded driver list
    // shows up on Master Fleet even when their violations are still zero.
    // Buckets that only exist because a violation row named an off-roster
    // VID still require a positive total to be listed.
    if (total === 0 && !rosterSeeded.has(b.vidKey)) return;
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
      hasMergedNights: b.hasMergedNights,
      underestimatedContinuous: b.underestimatedContinuous,
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
  mergeNights = true,
  maxDurationSeconds = null,
  underestimatedRule = null,
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
  const seenSpeed = new Set<string>();
  const seenNights = new Set<string>();
  const seenContinuous = new Set<string>();

  speedFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vid = cleanVidDisplay(driver.vid);
      const vidKey = normalizeVid(vid);
      const profile = resolve(vid);
      const driverName = profile.driverName || NOT_FOUND;
      const transporter = profile.transporter || sourceTransporter(driver);
      driver.events.forEach((event) => {
        const q = qualifyDuration(event.duration);
        if (failsDurationRules(q, thresholds.speed, maxDurationSeconds)) return;
        if (!(event.overspeedPosition && event.overspeedPosition.trim())) return;
        const evtKey = eventDateKey(event.start, event.end);
        const dupKey = duplicateKey(
          vidKey,
          driver.driverName,
          q,
          event.start,
          event.end,
        );
        if (seenSpeed.has(dupKey)) return;
        seenSpeed.add(dupKey);
        speed.push({
          id: event.id,
          vid,
          driverName,
          transporter,
          period: driver.period,
          start: event.start,
          end: event.end,
          duration: event.duration,
          durationSeconds: q.seconds,
          topSpeed: event.topSpeed,
          overspeedPosition: event.overspeedPosition,
          allowedVid: allowedSpeed.matches(vidKey, evtKey),
          allowedLocation: speedTags.matchesPosition(
            event.overspeedPosition,
            evtKey,
          ),
        });
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
      const merged = mergeNightRows(driver.rows, mergeNights, false);
      merged.forEach((row) => {
        const q = qualifyDuration(row.duration);
        if (failsDurationRules(q, thresholds.nights, maxDurationSeconds)) return;
        const evtKey = eventDateKey(row.timeA, row.timeB);
        const position = row.positionA || row.positionB || '';
        const allowedLocationA = nightsTags.matchesPosition(
          row.positionA,
          evtKey,
        );
        const allowedLocationB = nightsTags.matchesPosition(
          row.positionB,
          evtKey,
        );
        const dupKey = duplicateKey(
          vidKey,
          driver.driverName,
          q,
          row.timeA,
          row.timeB,
        );
        if (seenNights.has(dupKey)) return;
        seenNights.add(dupKey);
        nights.push({
          id: row.id,
          vid,
          driverName,
          transporter,
          period: driver.period,
          timeA: row.timeA,
          timeB: row.timeB,
          duration: row.duration,
          durationSeconds: q.seconds,
          length: row.length,
          position,
          positionA: row.positionA,
          positionB: row.positionB,
          allowedVid: allowedNights.matches(vidKey, evtKey),
          allowedLocation: allowedLocationA || allowedLocationB,
          allowedLocationA,
          allowedLocationB,
          mergedCount: row.mergedCount,
        });
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
        const q = qualifyDuration(row.duration);
        if (failsDurationRules(q, thresholds.continuous, maxDurationSeconds)) return;
        const hasPosition =
          Boolean(row.positionA && row.positionA.trim()) ||
          Boolean(row.positionB && row.positionB.trim());
        if (!hasPosition) return;
        const evtKey = eventDateKey(row.timeA, row.timeB);
        const position = row.positionB || row.positionA || '';
        const allowedLocationA = contTags.matchesPosition(
          row.positionA,
          evtKey,
        );
        const allowedLocationB = contTags.matchesPosition(
          row.positionB,
          evtKey,
        );
        const dupKey = duplicateKey(
          vidKey,
          driver.driverName,
          q,
          row.timeA,
          row.timeB,
        );
        if (seenContinuous.has(dupKey)) return;
        seenContinuous.add(dupKey);
        continuous.push({
          id: row.id,
          vid,
          driverName,
          transporter,
          period: driver.period,
          timeA: row.timeA,
          timeB: row.timeB,
          duration: row.duration,
          durationSeconds: q.seconds,
          length: row.length,
          position,
          positionA: row.positionA,
          positionB: row.positionB,
          allowedVid: allowedCont.matches(vidKey, evtKey),
          allowedLocation: allowedLocationA || allowedLocationB,
          allowedLocationA,
          allowedLocationB,
          underestimated: isUnderestimated(
            underestimatedRule,
            q.seconds,
            row.length,
          ),
        });
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
  'Recommended Action',
  'Allowed VID',
  'Speed in Allowed Zones',
  'Under-estimated (Continuous)',
] as const;

interface SheetRow {
  VID: string;
  'Driver Name': string;
  Transporter: string;
  Nights: number;
  Speed: number;
  Continuous: number;
  Total: number;
  'Recommended Action': string;
  'Allowed VID': string;
  'Speed in Allowed Zones': number;
  'Under-estimated (Continuous)': number;
}

export const downloadMasterFleetCsv = (
  rows: MasterFleetRow[],
  recommendedActionByVid: Record<string, string> = {},
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
    'Recommended Action': recommendedActionByVid[normalizeVid(r.vid)] || '',
    'Allowed VID': r.allowedVid ? 'YES' : '',
    'Speed in Allowed Zones': r.speedInAllowedLocations,
    'Under-estimated (Continuous)': r.underestimatedContinuous,
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

export const triggerCsvDownload = (csv: string, filename: string) => {
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
      'Under-estimated': e.underestimated ? 'YES' : '',
    })),
    {
      header: [
        'VID', 'Driver Name', 'Transporter', 'Period',
        'Time A', 'Time B', 'Duration', 'Length', 'Position',
        'Allowed VID', 'Allowed Location', 'Under-estimated',
      ],
    },
  );
  triggerCsvDownload(XLSX.utils.sheet_to_csv(ws), filename);
};

