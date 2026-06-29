import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UnfilteredNightFile, UnfilteredNightsState } from '../../types';

const initialState: UnfilteredNightsState = { files: [] };

const slice = createSlice({
  name: 'unfilteredNights',
  initialState,
  reducers: {
    addNightFile(state, action: PayloadAction<UnfilteredNightFile>) {
      state.files.unshift(action.payload);
    },
    removeNightFile(state, action: PayloadAction<string>) {
      state.files = state.files.filter((f) => f.id !== action.payload);
    },
    clearNights(state) {
      state.files = [];
    },
  },
});

export const { addNightFile, removeNightFile, clearNights } = slice.actions;
export default slice.reducer;
