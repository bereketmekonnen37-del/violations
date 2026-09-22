import * as XLSX from 'xlsx';
import { buildDriverProfileLookup, NOT_FOUND } from './driverLookup';
import {
  buildAllowedTagMatcher,
  buildAllowedVidMatcher,
  eventDateKey,
  normalizeVid,
} from './locationRules';
import {
  cleanVidDisplay,
  DEFAULT_THRESHOLDS,
  duplicateKey,
  exceedsMaxDuration,
  qualifyDuration,
  sourceTransporter,
  triggerCsvDownload,
  type AggregateInput,
} from './masterFleet';
import { mergeNightRows } from './nightsMerger';
import { isUnderestimated } from './underestimated';
import type {
  AllowedLocationLists,
  AllowedVidLists,
} from '../features/rules/rulesSlice';

export type EventKind = 'speed' | 'nights' | 'continuous';

export type RuleReasonCode =
  | 'below-threshold'
  | 'above-cap'
  | 'allowed-vid'
  | 'allowed-location'
  | 'under-estimated';

export const RULE_REASON_LABEL: Record<RuleReasonCode, string> = {
  'below-threshold': 'Below minimum duration',
  'above-cap': 'Above maximum duration cap',
  'allowed-vid': 'Allowed VID',
  'allowed-location': 'Allowed location',
  'under-estimated': 'Under-estimated',
};

export const KIND_LABEL: Record<EventKind, string> = {
  speed: 'Speed',
  nights: 'Nights',
  continuous: 'Continuous',
};

/** An event that at least one Rules-page rule affects (kept out of, or tagged
 *  within, the counted Master Fleet data). */
export interface RuleFilteredEvent {
  id: string;
  kind: EventKind;
  vid: string;
  driverName: string;
  transporter: string;
  period: string;
  /** Start (speed) / Time A (nights, continuous). */
  from: string;
  /** End (speed) / Time B (nights, continuous). */
  to: string;
  duration: string;
  durationSeconds: number;
  /** Top speed (speed) or distance length (nights, continuous). */
  metric: string;
  positionA: string;
  positionB: string;
  reasons: RuleReasonCode[];
  /** Human-readable explanation of each reason, incl. the rule's values. */
  reasonDetails: string[];
}

const EMPTY_ALLOWED: AllowedVidLists = { speed: [], nights: [], continuous: [] };
const EMPTY_ALLOWED_LOCATIONS: AllowedLocationLists = {
  speed: [],
  nights: [],
  continuous: [],
};

export const formatSeconds = (seconds: number): string => {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds}s`;
};

/**
 * Every Speed / Nights / Continuous row that a Rules-page rule touches:
 * below the minimum duration, above the maximum-duration cap, on an allowed
 * VID list, in an allowed location, or matching the under-estimated rule.
 * A row can carry several reasons. Rows no rule touches are omitted.
 *
 * Deduplication and night-merging mirror `collectFilteredEvents` so the same
 * physical event is never listed twice.
 */
export const collectRuleFilteredEvents = ({
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
}: AggregateInput): RuleFilteredEvent[] => {
  const resolve = buildDriverProfileLookup(driverRecords);
  const vidMatchers = {
    speed: buildAllowedVidMatcher(allowedVidsByType.speed),
    nights: buildAllowedVidMatcher(allowedVidsByType.nights),
    continuous: buildAllowedVidMatcher(allowedVidsByType.continuous),
  };
  const tagMatchers = {
    speed: buildAllowedTagMatcher(allowedLocationsByType.speed),
    nights: buildAllowedTagMatcher(allowedLocationsByType.nights),
    continuous: buildAllowedTagMatcher(allowedLocationsByType.continuous),
  };
  const seen: Record<EventKind, Set<string>> = {
    speed: new Set(),
    nights: new Set(),
    continuous: new Set(),
  };
  const out: RuleFilteredEvent[] = [];

  interface Candidate {
    kind: EventKind;
    id: string;
    vid: string;
    vidKey: string;
    sourceDriverName: string;
    driverName: string;
    transporter: string;
    period: string;
    from: string;
    to: string;
    duration: string;
    metric: string;
    positionA: string;
    positionB: string;
  }

  const evaluate = (c: Candidate) => {
    const q = qualifyDuration(c.duration);
    const dupKey = duplicateKey(c.vidKey, c.sourceDriverName, q, c.from, c.to);
    if (seen[c.kind].has(dupKey)) return;
    seen[c.kind].add(dupKey);

    const reasons: RuleReasonCode[] = [];
    const details: string[] = [];
    const evtKey = eventDateKey(c.from, c.to);
    const label = KIND_LABEL[c.kind];

    const below = q.hasDuration && q.seconds < thresholds[c.kind];
    const above = q.hasDuration && exceedsMaxDuration(q.seconds, maxDurationSeconds);
    if (below) {
      reasons.push('below-threshold');
      details.push(
        `Below ${label} minimum duration (${formatSeconds(thresholds[c.kind])})`,
      );
    }
    if (above) {
      reasons.push('above-cap');
      details.push(
        `Above the maximum duration cap (${formatSeconds(maxDurationSeconds ?? 0)})`,
      );
    }
    if (vidMatchers[c.kind].matches(c.vidKey, evtKey)) {
      reasons.push('allowed-vid');
      details.push(`Allowed VID (${label} list)`);
    }
    const inAllowedLocation =
      tagMatchers[c.kind].matchesPosition(c.positionA, evtKey) ||
      tagMatchers[c.kind].matchesPosition(c.positionB, evtKey);
    if (inAllowedLocation) {
      reasons.push('allowed-location');
      details.push(`Allowed location (${label} list)`);
    }
    if (
      c.kind === 'continuous' &&
      !below &&
      !above &&
      isUnderestimated(underestimatedRule, q.seconds, c.metric)
    ) {
      reasons.push('under-estimated');
      details.push(
        `Under-estimated (duration ≥ ${formatSeconds(
          underestimatedRule?.minDurationSeconds ?? 0,
        )} and distance ≤ ${underestimatedRule?.maxKm ?? 0} km)`,
      );
    }
    if (reasons.length === 0) return;

    out.push({
      id: c.id,
      kind: c.kind,
      vid: c.vid,
      driverName: c.driverName,
      transporter: c.transporter,
      period: c.period,
      from: c.from,
      to: c.to,
      duration: c.duration,
      durationSeconds: q.seconds,
      metric: c.metric,
      positionA: c.positionA,
      positionB: c.positionB,
      reasons,
      reasonDetails: details,
    });
  };

  const identity = (vidRaw: string, transporterFallback: string) => {
    const vid = cleanVidDisplay(vidRaw);
    const profile = resolve(vid);
    return {
      vid,
      vidKey: normalizeVid(vid),
      driverName: profile.driverName || NOT_FOUND,
      transporter: profile.transporter || transporterFallback,
    };
  };

  speedFiles.forEach((file) =>
    file.drivers.forEach((driver) => {
      const who = identity(driver.vid, sourceTransporter(driver));
      driver.events.forEach((e) =>
        evaluate({
          kind: 'speed',
          id: e.id,
          ...who,
          sourceDriverName: driver.driverName,
          period: driver.period,
          from: e.start,
          to: e.end,
          duration: e.duration,
          metric: e.topSpeed,
          positionA: e.overspeedPosition,
          positionB: '',
        }),
      );
    }),
  );

  nightFiles.forEach((file) =>
    file.drivers.forEach((driver) => {
      const who = identity(driver.vid, sourceTransporter(driver));
      mergeNightRows(driver.rows, mergeNights, false).forEach((r) =>
        evaluate({
          kind: 'nights',
          id: r.id,
          ...who,
          sourceDriverName: driver.driverName,
          period: driver.period,
          from: r.timeA,
          to: r.timeB,
          duration: r.duration,
          metric: r.length,
          positionA: r.positionA,
          positionB: r.positionB,
        }),
      );
    }),
  );

  continuousFiles.forEach((file) =>
    file.drivers.forEach((driver) => {
      const who = identity(driver.vid, sourceTransporter(driver));
      driver.rows.forEach((r) =>
        evaluate({
          kind: 'continuous',
          id: r.id,
          ...who,
          sourceDriverName: driver.driverName,
          period: driver.period,
          from: r.timeA,
          to: r.timeB,
          duration: r.duration,
          metric: r.length,
          positionA: r.positionA,
          positionB: r.positionB,
        }),
      );
    }),
  );

  return out.sort((a, b) => b.durationSeconds - a.durationSeconds);
};

/** Row tint by the strongest reason on the event (Filtered tab). */
export const primaryReason = (e: RuleFilteredEvent): RuleReasonCode => {
  const order: RuleReasonCode[] = [
    'allowed-vid',
    'allowed-location',
    'under-estimated',
    'above-cap',
    'below-threshold',
  ];
  return order.find((r) => e.reasons.includes(r)) ?? e.reasons[0];
};

export const downloadRuleFilteredCsv = (
  rows: RuleFilteredEvent[],
  filename = `fleetwatch-rule-filtered-${new Date().toISOString().slice(0, 10)}.csv`,
): number => {
  const header = [
    'Type',
    'VID',
    'Driver Name',
    'Transporter',
    'Period',
    'Start / Time A',
    'End / Time B',
    'Duration',
    'Top Speed / Length',
    'Position A',
    'Position B',
    'Filtered By Rule',
  ];
  const ws = XLSX.utils.json_to_sheet(
    rows.map((e) => ({
      Type: KIND_LABEL[e.kind],
      VID: e.vid,
      'Driver Name': e.driverName,
      Transporter: e.transporter,
      Period: e.period,
      'Start / Time A': e.from,
      'End / Time B': e.to,
      Duration: e.duration,
      'Top Speed / Length': e.metric,
      'Position A': e.positionA,
      'Position B': e.positionB,
      'Filtered By Rule': e.reasonDetails.join('; '),
    })),
    { header },
  );
  triggerCsvDownload(XLSX.utils.sheet_to_csv(ws), filename);
  return rows.length;
};
