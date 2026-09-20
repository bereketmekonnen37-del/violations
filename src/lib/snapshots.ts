import type { DriverRecord } from '../types';
import type {
  UnfilteredContinuousFile,
  UnfilteredFile,
  UnfilteredNightFile,
} from '../types';
import {
  aggregateMasterFleet,
  collectFilteredEvents,
  type FilteredEvents,
  type MasterFleetRow,
} from './masterFleet';
import {
  collectRuleFilteredEvents,
  RULE_REASON_LABEL,
  type EventKind,
  type RuleFilteredEvent,
  type RuleReasonCode,
} from './ruleFiltered';
import {
  applyRuleSelection,
  listActiveRules,
  type RuleSet,
  type SnapshotRuleItem,
} from './snapshotRules';
import { parseEventDate, toDateKey } from './locationRules';

/** Everything stored for one saved Master Fleet snapshot. */
export interface SnapshotData {
  version: 1;
  /** The ranking, exactly as Master Fleet showed it under `appliedRules`. */
  rows: MasterFleetRow[];
  /** The three event tabs (Speed / Nights / Continuous). */
  events: FilteredEvents;
  /** The Filtered tab. */
  ruleFiltered: RuleFilteredEvent[];
  /** Every rule that was active, and whether the boss kept it. */
  ruleItems: SnapshotRuleItem[];
  /** The effective rules the numbers were computed with. */
  appliedRules: RuleSet;
}

/** Small numbers shown on the folder list without loading the payload. */
export interface SnapshotSummary {
  drivers: number;
  speed: number;
  nights: number;
  continuous: number;
  total: number;
  transporters: number;
  filtered: number;
  rulesApplied: number;
  rulesRemoved: number;
}

export interface SnapshotMeta {
  id: string;
  name: string;
  createdAt: string;
  createdByName: string;
  summary: SnapshotSummary;
}

export interface SnapshotInput {
  speedFiles: UnfilteredFile[];
  nightFiles: UnfilteredNightFile[];
  continuousFiles: UnfilteredContinuousFile[];
  driverRecords: DriverRecord[];
  /** Rules in force on Master Fleet right now. */
  rules: RuleSet;
  /** Ids (from `listActiveRules`) the boss switched off for this snapshot. */
  removedRuleIds: ReadonlySet<string>;
}

export const transporterLabel = (name: string): string =>
  name.trim() || 'Unassigned';

export const summarizeSnapshot = (data: SnapshotData): SnapshotSummary => {
  const totals = data.rows.reduce(
    (acc, r) => {
      acc.speed += r.speed;
      acc.nights += r.nights;
      acc.continuous += r.continuous;
      return acc;
    },
    { speed: 0, nights: 0, continuous: 0 },
  );
  return {
    drivers: data.rows.length,
    ...totals,
    total: totals.speed + totals.nights + totals.continuous,
    transporters: new Set(data.rows.map((r) => transporterLabel(r.transporter))).size,
    filtered: data.ruleFiltered.length,
    rulesApplied: data.ruleItems.filter((i) => i.applied).length,
    rulesRemoved: data.ruleItems.filter((i) => !i.applied).length,
  };
};

/** Compute the Master Fleet data under the rules the boss chose to keep. */
export const buildSnapshotData = ({
  removedRuleIds,
  rules,
  ...files
}: SnapshotInput): SnapshotData => {
  const applied = applyRuleSelection(rules, removedRuleIds);
  const input = {
    ...files,
    thresholds: applied.thresholds,
    allowedVidsByType: applied.allowedVidsByType,
    allowedLocationsByType: applied.allowedLocationsByType,
    mergeNights: applied.mergeNights,
    maxDurationSeconds: applied.maxDurationSeconds,
    underestimatedRule: applied.underestimatedRule,
  };
  return {
    version: 1,
    rows: aggregateMasterFleet(input),
    events: collectFilteredEvents(input),
    ruleFiltered: collectRuleFilteredEvents(input),
    ruleItems: listActiveRules(rules).map((item) => ({
      ...item,
      applied: !removedRuleIds.has(item.id),
    })),
    appliedRules: applied,
  };
};

/* ── analytics ─────────────────────────────────────────────────────── */

export interface TransporterStat {
  name: string;
  speed: number;
  nights: number;
  continuous: number;
  total: number;
  vids: number;
}

export interface DayStat {
  date: string;
  speed: number;
  nights: number;
  continuous: number;
}

export interface HourStat {
  hour: string;
  speed: number;
  nights: number;
  continuous: number;
}

export interface SnapshotAnalytics {
  totals: { speed: number; nights: number; continuous: number; total: number };
  transporters: TransporterStat[];
  topVids: MasterFleetRow[];
  daily: DayStat[];
  hourly: HourStat[];
  filteredByReason: { reason: RuleReasonCode; label: string; count: number }[];
  filteredByKind: Record<EventKind, number>;
  /** Share of all counted violations that the single worst transporter owns. */
  topTransporterShare: number;
}

const isCounted = (e: {
  allowedVid: boolean;
  allowedLocation: boolean;
  underestimated?: boolean;
}): boolean => !e.allowedVid && !e.allowedLocation && !e.underestimated;

export const computeSnapshotAnalytics = (data: SnapshotData): SnapshotAnalytics => {
  const totals = { speed: 0, nights: 0, continuous: 0, total: 0 };
  const byTransporter = new Map<string, TransporterStat>();
  data.rows.forEach((r) => {
    totals.speed += r.speed;
    totals.nights += r.nights;
    totals.continuous += r.continuous;
    const name = transporterLabel(r.transporter);
    let t = byTransporter.get(name);
    if (!t) {
      t = { name, speed: 0, nights: 0, continuous: 0, total: 0, vids: 0 };
      byTransporter.set(name, t);
    }
    t.speed += r.speed;
    t.nights += r.nights;
    t.continuous += r.continuous;
    t.total += r.total;
    t.vids += 1;
  });
  totals.total = totals.speed + totals.nights + totals.continuous;

  const transporters = Array.from(byTransporter.values()).sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  );

  // Daily + hour-of-day, from the events that actually counted.
  const days = new Map<string, DayStat>();
  const hours: HourStat[] = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    speed: 0,
    nights: 0,
    continuous: 0,
  }));
  const bump = (kind: EventKind, raw: string) => {
    const d = parseEventDate(raw);
    if (!d) return;
    const key = toDateKey(d);
    let day = days.get(key);
    if (!day) {
      day = { date: key, speed: 0, nights: 0, continuous: 0 };
      days.set(key, day);
    }
    day[kind] += 1;
    hours[d.getHours()][kind] += 1;
  };
  data.events.speed.filter(isCounted).forEach((e) => bump('speed', e.start));
  data.events.nights.filter(isCounted).forEach((e) => bump('nights', e.timeA));
  data.events.continuous.filter(isCounted).forEach((e) => bump('continuous', e.timeA));

  const reasonCounts = new Map<RuleReasonCode, number>();
  const filteredByKind: Record<EventKind, number> = {
    speed: 0,
    nights: 0,
    continuous: 0,
  };
  data.ruleFiltered.forEach((e) => {
    filteredByKind[e.kind] += 1;
    e.reasons.forEach((r) => reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1));
  });

  return {
    totals,
    transporters,
    topVids: data.rows.slice(0, 10),
    daily: Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date)),
    hourly: hours,
    filteredByReason: Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, label: RULE_REASON_LABEL[reason], count }))
      .sort((a, b) => b.count - a.count),
    filteredByKind,
    topTransporterShare:
      totals.total > 0 && transporters.length > 0
        ? transporters[0].total / totals.total
        : 0,
  };
};
