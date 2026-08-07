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

export interface RulesState {
  thresholds: RuleThresholds;
  allowedVids: string[];
  allowedLocations: string[];
}

export const DEFAULT_RULE_THRESHOLDS: RuleThresholds = {
  speed: SPEED_MIN_SECONDS,
  nights: NIGHTS_MIN_SECONDS,
  continuous: CONTINUOUS_MIN_SECONDS,
};

const initialState: RulesState = {
  thresholds: DEFAULT_RULE_THRESHOLDS,
  allowedVids: [],
  allowedLocations: [],
};

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
    addAllowedVid(state, action: PayloadAction<string>) {
      const v = action.payload.trim();
      if (!v) return;
      if (!state.allowedVids.some((x) => x.toLowerCase() === v.toLowerCase())) {
        state.allowedVids.unshift(v);
      }
    },
    removeAllowedVid(state, action: PayloadAction<string>) {
      state.allowedVids = state.allowedVids.filter((x) => x !== action.payload);
    },
    clearAllowedVids(state) {
      state.allowedVids = [];
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
