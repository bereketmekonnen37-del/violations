import type {
  DriverRecord,
  UnfilteredContinuousFile,
  UnfilteredFile,
  UnfilteredNightFile,
} from '../types';
import type {
  AllowedLocationLists,
  AllowedVidLists,
} from '../features/rules/rulesSlice';
import {
  buildDriverProfileLookup,
  NOT_FOUND,
  type DriverProfileLookup,
} from './driverLookup';
import { parseDurationSeconds } from './duration';
import {
  blobHasAllowedTag,
  buildAllowedTagSet,
  buildAllowedVidSet,
  normalizeVid,
  positionHasAllowedTag,
} from './locationRules';
import type { EventThresholds } from './masterFleet';

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

export type ViolationKind = 'speed' | 'nights' | 'continuous';

export interface DailyBucket {
  /** YYYY-MM-DD */
  date: string;
  speed: number;
  nights: number;
  continuous: number;
}

export interface TopOffender {
  vid: string;
  driverName: string;
  transporter: string;
  count: number;
  /** Breakdown per category — populated for the combined-top offender. */
  breakdown?: { speed: number; nights: number; continuous: number };
}

export interface DashboardTopOffenders {
  combined: TopOffender | null;
  speed: TopOffender | null;
  nights: TopOffender | null;
  continuous: TopOffender | null;
}

interface AnalyticsInput {
  speedFiles: UnfilteredFile[];
  nightFiles: UnfilteredNightFile[];
  continuousFiles: UnfilteredContinuousFile[];
  driverRecords: DriverRecord[];
  thresholds: EventThresholds;
  allowedVidsByType?: AllowedVidLists;
  allowedLocationsByType?: AllowedLocationLists;
}

const parseEventDate = (raw: string): Date | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Try native parse (ISO-ish forms already work)
  const withT = new Date(trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T'));
  if (!Number.isNaN(withT.getTime())) return withT;
  const plain = new Date(trimmed);
  return Number.isNaN(plain.getTime()) ? null : plain;
};

const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface VioBucket {
  vidKey: string;
  vid: string;
  fallbackName: string;
  fallbackTransporter: string;
  speed: number;
  nights: number;
  continuous: number;
}

const bumpBucket = (
  buckets: Map<string, VioBucket>,
  vidRaw: string,
  fallbackName: string,
  fallbackTransporter: string,
  kind: ViolationKind,
): VioBucket | null => {
  const key = normalizeVid(vidRaw);
  if (!key) return null;
  let b = buckets.get(key);
  if (!b) {
    b = {
      vidKey: key,
      vid: vidRaw,
      fallbackName: '',
      fallbackTransporter: '',
      speed: 0,
      nights: 0,
      continuous: 0,
    };
    buckets.set(key, b);
  }
  if (!b.fallbackName && fallbackName) b.fallbackName = fallbackName;
  if (!b.fallbackTransporter && fallbackTransporter) {
    b.fallbackTransporter = fallbackTransporter;
  }
  b[kind] += 1;
  return b;
};

const bucketTop = (
  buckets: Map<string, VioBucket>,
  resolve: DriverProfileLookup,
  kind: ViolationKind,
): TopOffender | null => {
  let best: VioBucket | null = null;
  buckets.forEach((b) => {
    const c = b[kind];
    if (c === 0) return;
    if (!best || c > best[kind]) best = b;
  });
  if (!best) return null;
  // TS can't narrow inside a Map.forEach callback here.
  const winner = best as VioBucket;
  const profile = resolve(winner.vid);
  return {
    vid: winner.vid,
    driverName: profile.driverName || winner.fallbackName || NOT_FOUND,
    transporter: profile.transporter || winner.fallbackTransporter || '',
    count: winner[kind],
  };
};

const combinedTop = (
  buckets: Map<string, VioBucket>,
  resolve: DriverProfileLookup,
): TopOffender | null => {
  let best: VioBucket | null = null;
  let bestTotal = 0;
  buckets.forEach((b) => {
    const total = b.speed + b.nights + b.continuous;
    if (total === 0) return;
    if (!best || total > bestTotal) {
      best = b;
      bestTotal = total;
    }
  });
  if (!best) return null;
  const winner = best as VioBucket;
  const profile = resolve(winner.vid);
  return {
    vid: winner.vid,
    driverName: profile.driverName || winner.fallbackName || NOT_FOUND,
    transporter: profile.transporter || winner.fallbackTransporter || '',
    count: bestTotal,
    breakdown: {
      speed: winner.speed,
      nights: winner.nights,
      continuous: winner.continuous,
    },
  };
};

interface AnalyticsResult {
  daily: DailyBucket[];
  top: DashboardTopOffenders;
  totals: { speed: number; nights: number; continuous: number };
}

/**
 * Aggregate every unfiltered upload into daily buckets and top-offender
 * summaries. Applies thresholds (from Rules) and whitelist rules the same
 * way the Master Fleet page does.
 */
export const computeDashboardAnalytics = ({
  speedFiles,
  nightFiles,
  continuousFiles,
  driverRecords,
  thresholds,
  allowedVidsByType = EMPTY_ALLOWED,
  allowedLocationsByType = EMPTY_ALLOWED_LOCATIONS,
}: AnalyticsInput): AnalyticsResult => {
  const resolve = buildDriverProfileLookup(driverRecords);
  const allowedSpeedSet = buildAllowedVidSet(allowedVidsByType.speed);
  const allowedNightsSet = buildAllowedVidSet(allowedVidsByType.nights);
  const allowedContSet = buildAllowedVidSet(allowedVidsByType.continuous);
  const speedTagSet = buildAllowedTagSet(allowedLocationsByType.speed);
  const nightsTagSet = buildAllowedTagSet(allowedLocationsByType.nights);
  const contTagSet = buildAllowedTagSet(allowedLocationsByType.continuous);
  const daily = new Map<string, DailyBucket>();
  const buckets = new Map<string, VioBucket>();
  const totals = { speed: 0, nights: 0, continuous: 0 };

  const bumpDay = (date: Date, kind: ViolationKind) => {
    const key = toDateKey(date);
    let bucket = daily.get(key);
    if (!bucket) {
      bucket = { date: key, speed: 0, nights: 0, continuous: 0 };
      daily.set(key, bucket);
    }
    bucket[kind] += 1;
    totals[kind] += 1;
  };

  speedFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vidKey = normalizeVid(driver.vid);
      const skipVid = allowedSpeedSet.has(vidKey);
      driver.events.forEach((event) => {
        const seconds = parseDurationSeconds(event.duration);
        if (!Number.isFinite(seconds) || seconds < thresholds.speed) return;
        // Speed events in an allowed Speed location are NOT counted.
        if (
          speedTagSet.size > 0 &&
          blobHasAllowedTag(event.overspeedPosition, speedTagSet)
        ) {
          return;
        }
        if (skipVid) return;
        bumpBucket(
          buckets,
          driver.vid,
          driver.driverName,
          driver.transporter || driver.driverName || '',
          'speed',
        );
        const d = parseEventDate(event.start) ?? parseEventDate(event.end);
        if (d) bumpDay(d, 'speed');
      });
    });
  });

  nightFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vidKey = normalizeVid(driver.vid);
      const skipVid = allowedNightsSet.has(vidKey);
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (!Number.isFinite(seconds) || seconds < thresholds.nights) return;
        if (skipVid) return;
        if (
          nightsTagSet.size > 0 &&
          (positionHasAllowedTag(row.positionA, nightsTagSet) ||
            positionHasAllowedTag(row.positionB, nightsTagSet))
        ) {
          return;
        }
        bumpBucket(
          buckets,
          driver.vid,
          driver.driverName,
          driver.transporter || driver.driverName || '',
          'nights',
        );
        const d = parseEventDate(row.timeA) ?? parseEventDate(row.timeB);
        if (d) bumpDay(d, 'nights');
      });
    });
  });

  continuousFiles.forEach((file) => {
    file.drivers.forEach((driver) => {
      const vidKey = normalizeVid(driver.vid);
      const skipVid = allowedContSet.has(vidKey);
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (!Number.isFinite(seconds) || seconds < thresholds.continuous) return;
        if (skipVid) return;
        if (
          contTagSet.size > 0 &&
          (positionHasAllowedTag(row.positionA, contTagSet) ||
            positionHasAllowedTag(row.positionB, contTagSet))
        ) {
          return;
        }
        bumpBucket(
          buckets,
          driver.vid,
          driver.driverName,
          driver.transporter || driver.driverName || '',
          'continuous',
        );
        const d = parseEventDate(row.timeA) ?? parseEventDate(row.timeB);
        if (d) bumpDay(d, 'continuous');
      });
    });
  });

  const sortedDaily = Array.from(daily.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    daily: sortedDaily,
    top: {
      combined: combinedTop(buckets, resolve),
      speed: bucketTop(buckets, resolve, 'speed'),
      nights: bucketTop(buckets, resolve, 'nights'),
      continuous: bucketTop(buckets, resolve, 'continuous'),
    },
    totals,
  };
};

/**
 * Take the daily buckets and return the last N days, filling in gaps with
 * zeros so the chart has a continuous X-axis.
 *
 * When `daily` is empty, returns the last N calendar days ending today so
 * the chart still renders a nice empty state.
 */
export const fillDailyWindow = (
  daily: DailyBucket[],
  days: number,
): DailyBucket[] => {
  const anchor =
    daily.length > 0
      ? new Date(daily[daily.length - 1].date + 'T00:00:00')
      : new Date();
  const byKey = new Map(daily.map((d) => [d.date, d]));
  const out: DailyBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const key = toDateKey(d);
    out.push(byKey.get(key) ?? { date: key, speed: 0, nights: 0, continuous: 0 });
  }
  return out;
};
