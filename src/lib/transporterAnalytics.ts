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
import { normalizeVid } from './locationRules';
import {
  collectCountedEvents,
  type EventThresholds,
} from './masterFleet';

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
  mergeNights?: boolean;
  maxDurationSeconds?: number | null;
  underestimatedRule?: UnderestimatedRule | null;
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
 * Aggregate per-transporter violation counts. Consumes the same
 * `collectCountedEvents` output as Master Fleet and Dashboard analytics
 * so numbers match category-by-category — no divergent dedup, threshold
 * or zero-duration handling.
 */
export const computeTransporterAnalytics = (
  input: AnalyticsInput,
): TransporterAnalyticsRow[] => {
  const { driverRecords } = input;

  // Prime the VID → canonical transporter map from the boss's roster so
  // grouping matches Master Fleet even when the raw upload block has a
  // shortened or empty transporter cell.
  const vidToTransporter = new Map<string, string>();
  driverRecords.forEach((r) => {
    const key = normalizeVid(r.vid);
    if (!key) return;
    if (!vidToTransporter.has(key) && r.transporter) {
      vidToTransporter.set(key, r.transporter);
    }
  });

  const resolveTransporter = (
    vidKey: string,
    blockTransporter: string,
    driverName: string,
  ): string => {
    const canonical = vidToTransporter.get(vidKey);
    if (canonical) return canonical.trim();
    if (blockTransporter && blockTransporter.trim()) return blockTransporter.trim();
    return driverName ? driverName.trim() : '';
  };

  const { events } = collectCountedEvents(input);
  const buckets = new Map<string, Bucket>();

  // Seed with the fixed transporter list so they always appear.
  KNOWN_TRANSPORTERS.forEach((name) => getBucket(buckets, name));

  events.forEach((e) => {
    const t = resolveTransporter(e.vidKey, e.transporter, e.driverName);
    const b = getBucket(buckets, t);
    if (!b) return;
    if (e.vidKey) b.vids.add(e.vidKey);
    b[e.kind] += 1;
  });

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
