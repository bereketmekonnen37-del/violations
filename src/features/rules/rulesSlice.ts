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

export interface AllowedVidLists {
  speed: string[];
  nights: string[];
  continuous: string[];
}

export type AllowedLocationLists = AllowedVidLists;

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

const emptyByType = (): AllowedVidLists => ({
  speed: [],
  nights: [],
  continuous: [],
});

const initialState: RulesState = {
  thresholds: DEFAULT_RULE_THRESHOLDS,
  allowedVidsByType: emptyByType(),
  allowedLocationsByType: emptyByType(),
};

interface AllowedVidPayload {
  category: AllowedVidCategory;
  value: string;
}

interface AllowedLocationPayload {
  category: AllowedLocationCategory;
  value: string;
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
    addAllowedVid(state, action: PayloadAction<AllowedVidPayload>) {
      const v = action.payload.value.trim();
      if (!v) return;
      const list = state.allowedVidsByType[action.payload.category];
      if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) {
        list.unshift(v);
      }
    },
    removeAllowedVid(state, action: PayloadAction<AllowedVidPayload>) {
      const list = state.allowedVidsByType[action.payload.category];
      state.allowedVidsByType[action.payload.category] = list.filter(
        (x) => x !== action.payload.value,
      );
    },
    clearAllowedVids(state, action: PayloadAction<AllowedVidCategory>) {
      state.allowedVidsByType[action.payload] = [];
    },
    addAllowedLocation(state, action: PayloadAction<AllowedLocationPayload>) {
      const v = action.payload.value.trim();
      if (!v) return;
      const list = state.allowedLocationsByType[action.payload.category];
      if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) {
        list.unshift(v);
      }
    },
    removeAllowedLocation(
      state,
      action: PayloadAction<AllowedLocationPayload>,
    ) {
      const list = state.allowedLocationsByType[action.payload.category];
      state.allowedLocationsByType[action.payload.category] = list.filter(
        (x) => x !== action.payload.value,
      );
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
  clearAllowedVids,
  addAllowedLocation,
  removeAllowedLocation,
  clearAllowedLocations,
} = rulesSlice.actions;

export default rulesSlice.reducer;
