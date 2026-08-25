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
import { parseDurationSeconds } from './duration';
import {
  buildAllowedTagMatcher,
  buildAllowedVidMatcher,
  eventDateKey,
  normalizeVid,
} from './locationRules';
import type { EventThresholds } from './masterFleet';
import { mergeNightRows } from './nightsMerger';

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

/**
 * Canonical list of transporters we always want to surface on the
 * dashboard analytics section, even when they have zero data yet.
 * The order here is alphabetical (the UI sorts by violation total,
 * with this list acting as the tie-break population).
 */
export const KNOWN_TRANSPORTERS: readonly string[] = [
  'Abayneh Kebede',
  'Awash Zego',
  'Ayal Tizazu',
  'BEETAR Plc.',
  'Binyam Mekbeb',
  'Dagnachew Abebe',
  'Dagnew Negash',
  'FAMNET Plc.',
  'Getenet Mohamed',
  'Ghion Industrial Plc.',
  'GMT Industrial Plc.',
  'Golden N Blue',
  'Habtom Abaddi',
  'Hagos & Alemstaye',
  'Hailu Kindya',
  'Hidassie',
  'Kehasie Lemlem',
  'Khalid Mohammed',
  'Kisadael Trading',
  'Solomon Yohanes',
  'Welde Michael Halefom',
  'Wubejeg & Abrham',
  'Yared Hadgu',
  'Yaregal Mammo',
  'Yohannes Demma',
  'Yonas Mekonen',
  'Zemen Business Group',
];

const norm = (raw: string | undefined): string =>
  (raw ?? '').trim().toLowerCase();

/** Percent-encode transporter name for URL parameters. */
export const encodeTransporterSlug = (name: string): string =>
  encodeURIComponent(name);

export const decodeTransporterSlug = (slug: string): string => {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
};

export interface TransporterAnalyticsRow {
  name: string;
  speed: number;
  nights: number;
  continuous: number;
  total: number;
  /** True when the transporter is in KNOWN_TRANSPORTERS. */
  known: boolean;
  /** Number of unique VIDs seen for this transporter across all uploads. */
  vidCount: number;
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

interface Bucket {
  displayName: string;
  speed: number;
  nights: number;
  continuous: number;
  vids: Set<string>;
}

const getBucket = (
  buckets: Map<string, Bucket>,
  rawName: string,
): Bucket | null => {
  const key = norm(rawName);
  if (!key) return null;
  let b = buckets.get(key);
  if (!b) {
    b = {
      displayName: rawName.trim(),
      speed: 0,
      nights: 0,
      continuous: 0,
      vids: new Set<string>(),
    };
    buckets.set(key, b);
  }
  return b;
};

/**
 * Aggregate per-transporter violation counts, applying the same rule
 * thresholds and whitelists used by the Master Fleet + Dashboard.
 */
export const computeTransporterAnalytics = ({
  speedFiles,
  nightFiles,
  continuousFiles,
  driverRecords,
  thresholds,
  allowedVidsByType = EMPTY_ALLOWED,
  allowedLocationsByType = EMPTY_ALLOWED_LOCATIONS,
}: AnalyticsInput): TransporterAnalyticsRow[] => {
  const allowedSpeed = buildAllowedVidMatcher(allowedVidsByType.speed);
  const allowedNights = buildAllowedVidMatcher(allowedVidsByType.nights);
  const allowedCont = buildAllowedVidMatcher(allowedVidsByType.continuous);
  const speedTags = buildAllowedTagMatcher(allowedLocationsByType.speed);
  const nightsTags = buildAllowedTagMatcher(allowedLocationsByType.nights);
  const contTags = buildAllowedTagMatcher(allowedLocationsByType.continuous);

  // Prime the lookup from driver records so a VID → transporter mapping
  // is available even when the upload's driver block has an empty
  // transporter cell.
  const vidToTransporter = new Map<string, string>();
  driverRecords.forEach((r) => {
    const key = normalizeVid(r.vid);
    if (!key) return;
    if (!vidToTransporter.has(key) && r.transporter) {
      vidToTransporter.set(key, r.transporter);
    }
  });

  const resolveTransporter = (
    vid: string,
    blockTransporter: string,
  ): string => {
    if (blockTransporter && blockTransporter.trim()) return blockTransporter.trim();
    const key = normalizeVid(vid);
    return vidToTransporter.get(key) ?? '';
  };

  const buckets = new Map<string, Bucket>();

  // Seed with the fixed transporter list so they always appear.
  KNOWN_TRANSPORTERS.forEach((name) => getBucket(buckets, name));

  speedFiles.forEach((file) =>
    file.drivers.forEach((driver) => {
      const t = resolveTransporter(driver.vid, driver.transporter);
      const b = getBucket(buckets, t);
      if (!b) return;
      const vidKey = normalizeVid(driver.vid);
      if (driver.vid) b.vids.add(vidKey);
      driver.events.forEach((event) => {
        const seconds = parseDurationSeconds(event.duration);
        if (!Number.isFinite(seconds) || seconds < thresholds.speed) return;
        if (!(event.overspeedPosition && event.overspeedPosition.trim())) return;
        const evtKey = eventDateKey(event.start, event.end);
        if (speedTags.matchesPosition(event.overspeedPosition, evtKey)) return;
        if (allowedSpeed.matches(vidKey, evtKey)) return;
        b.speed += 1;
      });
    }),
  );

  nightFiles.forEach((file) =>
    file.drivers.forEach((driver) => {
      const t = resolveTransporter(driver.vid, driver.transporter);
      const b = getBucket(buckets, t);
      if (!b) return;
      const vidKey = normalizeVid(driver.vid);
      if (driver.vid) b.vids.add(vidKey);
      const merged = mergeNightRows(driver.rows);
      merged.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (!Number.isFinite(seconds) || seconds < thresholds.nights) return;
        const evtKey = eventDateKey(row.timeA, row.timeB);
        if (allowedNights.matches(vidKey, evtKey)) return;
        if (
          nightsTags.matchesPosition(row.positionA, evtKey) ||
          nightsTags.matchesPosition(row.positionB, evtKey)
        ) {
          return;
        }
        b.nights += 1;
      });
    }),
  );

  continuousFiles.forEach((file) =>
    file.drivers.forEach((driver) => {
      const t = resolveTransporter(driver.vid, driver.transporter);
      const b = getBucket(buckets, t);
      if (!b) return;
      const vidKey = normalizeVid(driver.vid);
      if (driver.vid) b.vids.add(vidKey);
      driver.rows.forEach((row) => {
        const seconds = parseDurationSeconds(row.duration);
        if (!Number.isFinite(seconds) || seconds < thresholds.continuous) return;
        const hasPosition =
          Boolean(row.positionA && row.positionA.trim()) ||
          Boolean(row.positionB && row.positionB.trim());
        if (!hasPosition) return;
        const evtKey = eventDateKey(row.timeA, row.timeB);
        if (allowedCont.matches(vidKey, evtKey)) return;
        if (
          contTags.matchesPosition(row.positionA, evtKey) ||
          contTags.matchesPosition(row.positionB, evtKey)
        ) {
          return;
        }
        b.continuous += 1;
      });
    }),
  );

  const knownSet = new Set(KNOWN_TRANSPORTERS.map((n) => norm(n)));

  const rows: TransporterAnalyticsRow[] = [];
  buckets.forEach((b, key) => {
    rows.push({
      name: b.displayName,
      speed: b.speed,
      nights: b.nights,
      continuous: b.continuous,
      total: b.speed + b.nights + b.continuous,
      known: knownSet.has(key),
      vidCount: b.vids.size,
    });
  });

  // Highest violation counts on top; within a tie, keep the known list's
  // alphabetical order (via displayName compare).
  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name);
  });

  return rows;
};
