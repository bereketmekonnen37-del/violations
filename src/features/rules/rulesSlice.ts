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

export interface AllowedVidLists {
  speed: string[];
  nights: string[];
  continuous: string[];
}

export interface RulesState {
  thresholds: RuleThresholds;
  allowedVidsByType: AllowedVidLists;
  allowedLocations: string[];
}

export const DEFAULT_RULE_THRESHOLDS: RuleThresholds = {
  speed: SPEED_MIN_SECONDS,
  nights: NIGHTS_MIN_SECONDS,
  continuous: CONTINUOUS_MIN_SECONDS,
};

const emptyAllowedVids = (): AllowedVidLists => ({
  speed: [],
  nights: [],
  continuous: [],
});

const initialState: RulesState = {
  thresholds: DEFAULT_RULE_THRESHOLDS,
  allowedVidsByType: emptyAllowedVids(),
  allowedLocations: [],
};

interface AllowedVidPayload {
  category: AllowedVidCategory;
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
    addAllowedLocation(state, action: PayloadAction<string>) {
      const v = action.payload.trim();
      if (!v) return;
      if (
        !state.allowedLocations.some(
          (x) => x.toLowerCase() === v.toLowerCase(),
        )
      ) {
        state.allowedLocations.unshift(v);
      }
    },
    removeAllowedLocation(state, action: PayloadAction<string>) {
      state.allowedLocations = state.allowedLocations.filter(
        (x) => x !== action.payload,
      );
    },
    clearAllowedLocations(state) {
      state.allowedLocations = [];
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
