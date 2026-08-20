import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  CONTINUOUS_MIN_SECONDS,
  NIGHTS_MIN_SECONDS,
  SPEED_MIN_SECONDS,
} from '../../lib/duration';

export interface RuleThresholds {
  speed: number;
  nights: number;
  continuous: number;
}

export type AllowedVidCategory = 'speed' | 'nights' | 'continuous';
export type AllowedLocationCategory = AllowedVidCategory;

/**
 * A single allowed-VID entry. When `dates` is empty the entry applies to
 * every event. When `dates` has one or more ISO `YYYY-MM-DD` strings the
 * entry only applies to events whose start date is in that set.
 */
export interface AllowedVidEntry {
  vid: string;
  dates: string[];
}

export interface AllowedLocationEntry {
  value: string;
  dates: string[];
}

export interface AllowedVidLists {
  speed: AllowedVidEntry[];
  nights: AllowedVidEntry[];
  continuous: AllowedVidEntry[];
}

export interface AllowedLocationLists {
  speed: AllowedLocationEntry[];
  nights: AllowedLocationEntry[];
  continuous: AllowedLocationEntry[];
}

export interface RulesState {
  thresholds: RuleThresholds;
  allowedVidsByType: AllowedVidLists;
  allowedLocationsByType: AllowedLocationLists;
}

export const DEFAULT_RULE_THRESHOLDS: RuleThresholds = {
  speed: SPEED_MIN_SECONDS,
  nights: NIGHTS_MIN_SECONDS,
  continuous: CONTINUOUS_MIN_SECONDS,
};

const emptyVidLists = (): AllowedVidLists => ({
  speed: [],
  nights: [],
  continuous: [],
});

const emptyLocationLists = (): AllowedLocationLists => ({
  speed: [],
  nights: [],
  continuous: [],
});

const initialState: RulesState = {
  thresholds: DEFAULT_RULE_THRESHOLDS,
  allowedVidsByType: emptyVidLists(),
  allowedLocationsByType: emptyLocationLists(),
};

const eqValue = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

const mergeDates = (existing: string[], incoming: string[]): string[] => {
  const set = new Set<string>();
  existing.forEach((d) => d && set.add(d));
  incoming.forEach((d) => d && set.add(d));
  return Array.from(set).sort();
};

interface AddVidPayload {
  category: AllowedVidCategory;
  value: string;
  dates?: string[];
}
interface RemoveVidPayload {
  category: AllowedVidCategory;
  value: string;
}
interface SetVidDatesPayload {
  category: AllowedVidCategory;
  value: string;
  dates: string[];
}

interface AddLocationPayload {
  category: AllowedLocationCategory;
  value: string;
  dates?: string[];
}
interface RemoveLocationPayload {
  category: AllowedLocationCategory;
  value: string;
}
interface SetLocationDatesPayload {
  category: AllowedLocationCategory;
  value: string;
  dates: string[];
}

const rulesSlice = createSlice({
  name: 'rules',
  initialState,
  reducers: {
    setThresholds(state, action: PayloadAction<RuleThresholds>) {
      state.thresholds = action.payload;
    },
    resetThresholds(state) {
      state.thresholds = DEFAULT_RULE_THRESHOLDS;
    },

    /* ── VIDs ─────────────────────────────────────────────────────── */

    addAllowedVid(state, action: PayloadAction<AddVidPayload>) {
      const value = action.payload.value.trim();
      if (!value) return;
      const dates = (action.payload.dates ?? []).filter(Boolean);
      const list = state.allowedVidsByType[action.payload.category];
      const existing = list.find((e) => eqValue(e.vid, value));
      if (existing) {
        existing.dates = mergeDates(existing.dates, dates);
        return;
      }
      list.unshift({ vid: value, dates: mergeDates([], dates) });
    },
    removeAllowedVid(state, action: PayloadAction<RemoveVidPayload>) {
      const list = state.allowedVidsByType[action.payload.category];
      state.allowedVidsByType[action.payload.category] = list.filter(
        (e) => !eqValue(e.vid, action.payload.value),
      );
    },
    setAllowedVidDates(state, action: PayloadAction<SetVidDatesPayload>) {
      const list = state.allowedVidsByType[action.payload.category];
      const existing = list.find((e) => eqValue(e.vid, action.payload.value));
      if (!existing) return;
      existing.dates = mergeDates([], action.payload.dates);
    },
    clearAllowedVids(state, action: PayloadAction<AllowedVidCategory>) {
      state.allowedVidsByType[action.payload] = [];
    },

    /* ── Locations ────────────────────────────────────────────────── */

    addAllowedLocation(state, action: PayloadAction<AddLocationPayload>) {
      const value = action.payload.value.trim();
      if (!value) return;
      const dates = (action.payload.dates ?? []).filter(Boolean);
      const list = state.allowedLocationsByType[action.payload.category];
      const existing = list.find((e) => eqValue(e.value, value));
      if (existing) {
        existing.dates = mergeDates(existing.dates, dates);
        return;
      }
      list.unshift({ value, dates: mergeDates([], dates) });
    },
    removeAllowedLocation(state, action: PayloadAction<RemoveLocationPayload>) {
      const list = state.allowedLocationsByType[action.payload.category];
      state.allowedLocationsByType[action.payload.category] = list.filter(
        (e) => !eqValue(e.value, action.payload.value),
      );
    },
    setAllowedLocationDates(
      state,
      action: PayloadAction<SetLocationDatesPayload>,
    ) {
      const list = state.allowedLocationsByType[action.payload.category];
      const existing = list.find((e) =>
        eqValue(e.value, action.payload.value),
      );
      if (!existing) return;
      existing.dates = mergeDates([], action.payload.dates);
    },
    clearAllowedLocations(
      state,
      action: PayloadAction<AllowedLocationCategory>,
    ) {
      state.allowedLocationsByType[action.payload] = [];
    },
  },
});

export const {
  setThresholds,
  resetThresholds,
  addAllowedVid,
  removeAllowedVid,
  setAllowedVidDates,
  clearAllowedVids,
  addAllowedLocation,
  removeAllowedLocation,
  setAllowedLocationDates,
  clearAllowedLocations,
} = rulesSlice.actions;

export default rulesSlice.reducer;
