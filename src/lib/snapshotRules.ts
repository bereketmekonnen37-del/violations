import type {
  AllowedLocationLists,
  AllowedVidLists,
  RuleThresholds,
  UnderestimatedRule,
} from '../features/rules/rulesSlice';
import { formatSeconds, KIND_LABEL, type EventKind } from './ruleFiltered';

/** Every rule that shapes the Master Fleet numbers, in one bundle. */
export interface RuleSet {
  thresholds: RuleThresholds;
  maxDurationSeconds: number | null;
  underestimatedRule: UnderestimatedRule | null;
  allowedVidsByType: AllowedVidLists;
  allowedLocationsByType: AllowedLocationLists;
  mergeNights: boolean;
}

/** One line in the "active rules" list shown when saving a snapshot. */
export interface RuleItem {
  /** Stable id: `threshold:speed`, `cap`, `underestimated`, `vids:nights`,
   *  `locations:continuous`, `merge`. */
  id: string;
  group: 'Duration' | 'Whitelist' | 'Other';
  label: string;
  detail: string;
  /** Extra values to preview (VIDs / locations), empty for plain rules. */
  chips: string[];
}

/** What was recorded about a rule when the snapshot was saved. */
export interface SnapshotRuleItem extends RuleItem {
  /** False when the boss removed this rule for the snapshot. */
  applied: boolean;
}

const KINDS: EventKind[] = ['speed', 'nights', 'continuous'];

const scopeText = (dates: string[]): string =>
  dates.length === 0
    ? ''
    : ` (${dates.length} day${dates.length === 1 ? '' : 's'})`;

/** The rules that are currently in force, as toggleable items. */
export const listActiveRules = (rules: RuleSet): RuleItem[] => {
  const items: RuleItem[] = [];

  KINDS.forEach((k) =>
    items.push({
      id: `threshold:${k}`,
      group: 'Duration',
      label: `${KIND_LABEL[k]} minimum duration`,
      detail: `Only ${KIND_LABEL[k]} events of ${formatSeconds(rules.thresholds[k])} or longer count.`,
      chips: [],
    }),
  );

  if (rules.maxDurationSeconds != null && rules.maxDurationSeconds > 0) {
    items.push({
      id: 'cap',
      group: 'Duration',
      label: 'Maximum duration cap',
      detail: `Events longer than ${formatSeconds(rules.maxDurationSeconds)} are dropped.`,
      chips: [],
    });
  }

  if (rules.underestimatedRule) {
    items.push({
      id: 'underestimated',
      group: 'Duration',
      label: 'Under-estimated continuous rule',
      detail: `Continuous events of ${formatSeconds(
        rules.underestimatedRule.minDurationSeconds,
      )} or more covering ${rules.underestimatedRule.maxKm} km or less are not counted.`,
      chips: [],
    });
  }

  KINDS.forEach((k) => {
    const list = rules.allowedVidsByType[k];
    if (list.length === 0) return;
    items.push({
      id: `vids:${k}`,
      group: 'Whitelist',
      label: `Allowed VIDs · ${KIND_LABEL[k]}`,
      detail: `${list.length} VID${list.length === 1 ? '' : 's'} excluded from ${KIND_LABEL[k]} counts.`,
      chips: list.map((e) => `${e.vid}${scopeText(e.dates)}`),
    });
  });

  KINDS.forEach((k) => {
    const list = rules.allowedLocationsByType[k];
    if (list.length === 0) return;
    items.push({
      id: `locations:${k}`,
      group: 'Whitelist',
      label: `Allowed locations · ${KIND_LABEL[k]}`,
      detail: `${list.length} location${list.length === 1 ? '' : 's'} excluded from ${KIND_LABEL[k]} counts.`,
      chips: list.map((e) => `${e.value}${scopeText(e.dates)}`),
    });
  });

  if (rules.mergeNights) {
    items.push({
      id: 'merge',
      group: 'Other',
      label: 'Merge nights',
      detail: 'Night events in the same 18:00–06:00 shift collapse into one row per VID.',
      chips: [],
    });
  }

  return items;
};

/**
 * The rules that actually apply once the boss has removed some.
 * `removedIds` are the ids from `listActiveRules` he switched off.
 * A removed minimum duration means "no minimum" (0), everything else is
 * switched off or emptied.
 */
export const applyRuleSelection = (
  rules: RuleSet,
  removedIds: ReadonlySet<string>,
): RuleSet => {
  const off = (id: string) => removedIds.has(id);
  const thresholds: RuleThresholds = {
    speed: off('threshold:speed') ? 0 : rules.thresholds.speed,
    nights: off('threshold:nights') ? 0 : rules.thresholds.nights,
    continuous: off('threshold:continuous') ? 0 : rules.thresholds.continuous,
  };
  return {
    thresholds,
    maxDurationSeconds: off('cap') ? null : rules.maxDurationSeconds,
    underestimatedRule: off('underestimated') ? null : rules.underestimatedRule,
    allowedVidsByType: {
      speed: off('vids:speed') ? [] : rules.allowedVidsByType.speed,
      nights: off('vids:nights') ? [] : rules.allowedVidsByType.nights,
      continuous: off('vids:continuous') ? [] : rules.allowedVidsByType.continuous,
    },
    allowedLocationsByType: {
      speed: off('locations:speed') ? [] : rules.allowedLocationsByType.speed,
      nights: off('locations:nights') ? [] : rules.allowedLocationsByType.nights,
      continuous: off('locations:continuous')
        ? []
        : rules.allowedLocationsByType.continuous,
    },
    mergeNights: off('merge') ? false : rules.mergeNights,
  };
};
