import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type TimeMode = 'default' | 'ethiopian';

/**
 * Fixed hour offset applied when converting raw timestamps to Ethiopian time.
 * Chosen to match the boss's observation that when it is ~20:00 in Ethiopia
 * the timestamps in the app show ~14:00 — i.e. the raw data is 6 hours
 * behind Ethiopian local time. Keep this literal in one place so the whole
 * UI stays in sync.
 */
export const ETHIOPIAN_OFFSET_HOURS = 6;

/**
 * Business-day rollover cutoff for Ethiopian analytics. Any violation whose
 * Ethiopian-clock hour falls before this cutoff (00:00–05:59) is grouped
 * with the *previous* calendar day so a single overnight shift stays as one
 * day of activity in the totals.
 */
export const ETHIOPIAN_DAY_ROLLOVER_HOUR = 6;

export interface TimeModeState {
  mode: TimeMode;
}

const initialState: TimeModeState = { mode: 'default' };

const timeModeSlice = createSlice({
  name: 'timeMode',
  initialState,
  reducers: {
    setTimeMode(state, action: PayloadAction<TimeMode>) {
      state.mode = action.payload;
    },
    toggleTimeMode(state) {
      state.mode = state.mode === 'ethiopian' ? 'default' : 'ethiopian';
    },
  },
});

export const { setTimeMode, toggleTimeMode } = timeModeSlice.actions;
export default timeModeSlice.reducer;
