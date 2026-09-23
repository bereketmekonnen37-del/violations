import type {
  DriverRecord,
  UnfilteredContinuousFile,
  UnfilteredFile,
  UnfilteredNightFile,
} from '../types';
import type {
  AllowedLocationLists,
  AllowedVidLists,
  UnderestimatedRule,
} from '../features/rules/rulesSlice';
import {
  buildDriverProfileLookup,
  NOT_FOUND,
  type DriverProfileLookup,
} from './driverLookup';
import { toDateKey } from './locationRules';
import {
  collectCountedEvents,
  type CountedEvent,
  type EventThresholds,
} from './masterFleet';

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
  mergeNights?: boolean;
  maxDurationSeconds?: number | null;
  underestimatedRule?: UnderestimatedRule | null;
}

interface VioBucket {
  vidKey: string;
  vid: string;
  fallbackName: string;
  fallbackTransporter: string;
  speed: number;
  nights: number;
  continuous: number;
}

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
 * summaries. Consumes `collectCountedEvents` so the totals here match
 * Master Fleet + Transporter analytics exactly — same dedup, same
 * threshold + whitelist rules, same treatment of zero-duration rows,
 * same handling of merged nights and the under-estimated rule.
 */
export const computeDashboardAnalytics = (
  input: AnalyticsInput,
): AnalyticsResult => {
  const resolve = buildDriverProfileLookup(input.driverRecords);
  const { events } = collectCountedEvents(input);

  const daily = new Map<string, DailyBucket>();
  const buckets = new Map<string, VioBucket>();
  const totals = { speed: 0, nights: 0, continuous: 0 };

  const addToBucket = (e: CountedEvent) => {
    let b = buckets.get(e.vidKey);
    if (!b) {
      b = {
        vidKey: e.vidKey,
        vid: e.vid,
        fallbackName: '',
        fallbackTransporter: '',
        speed: 0,
        nights: 0,
        continuous: 0,
      };
      buckets.set(e.vidKey, b);
    }
    if (!b.fallbackName && e.driverName) b.fallbackName = e.driverName;
    if (!b.fallbackTransporter && e.transporter) {
      b.fallbackTransporter = e.transporter;
    }
    b[e.kind] += 1;
  };

  events.forEach((e) => {
    totals[e.kind] += 1;
    addToBucket(e);
    if (e.dateKey) {
      let bucket = daily.get(e.dateKey);
      if (!bucket) {
        bucket = { date: e.dateKey, speed: 0, nights: 0, continuous: 0 };
        daily.set(e.dateKey, bucket);
      }
      bucket[e.kind] += 1;
    }
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

/**
 * Take the daily buckets and return every day from the oldest to the newest
 * recorded violation (inclusive), filling any gap days with zeros so the
 * dashboard trend chart covers the full history instead of a fixed window.
 *
 * When `daily` is empty, falls back to the last 14 calendar days ending
 * today so the chart still renders a nice empty state.
 */
export const fillDailyRange = (daily: DailyBucket[]): DailyBucket[] => {
  if (daily.length === 0) return fillDailyWindow(daily, 14);
  const byKey = new Map(daily.map((d) => [d.date, d]));
  const start = new Date(daily[0].date + 'T00:00:00');
  const end = new Date(daily[daily.length - 1].date + 'T00:00:00');
  const out: DailyBucket[] = [];
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const key = toDateKey(cursor);
    out.push(byKey.get(key) ?? { date: key, speed: 0, nights: 0, continuous: 0 });
  }
  return out;
};
