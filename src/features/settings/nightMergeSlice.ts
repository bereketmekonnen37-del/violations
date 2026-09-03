import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface NightMergeState {
  /** When true (default), consecutive night rows for the same VID inside the
   *  18:00–06:00 shift window are collapsed into one row across Master
   *  Fleet, Dashboard analytics and Transporter analytics. Toggled from the
   *  navbar to show every raw night row one by one instead. */
  enabled: boolean;
}

const initialState: NightMergeState = { enabled: true };

const nightMergeSlice = createSlice({
  name: 'nightMerge',
  initialState,
  reducers: {
    setNightMergeEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
    },
    toggleNightMerge(state) {
      state.enabled = !state.enabled;
    },
  },
});

export const { setNightMergeEnabled, toggleNightMerge } = nightMergeSlice.actions;
export default nightMergeSlice.reducer;
