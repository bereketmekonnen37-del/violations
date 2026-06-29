import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UnfilteredFile, UnfilteredState } from '../../types';

const initialState: UnfilteredState = { files: [] };

const unfilteredSlice = createSlice({
  name: 'unfiltered',
  initialState,
  reducers: {
    addUnfilteredFile(state, action: PayloadAction<UnfilteredFile>) {
      state.files.unshift(action.payload);
    },
    removeUnfilteredFile(state, action: PayloadAction<string>) {
      state.files = state.files.filter((f) => f.id !== action.payload);
    },
    clearUnfiltered(state) {
      state.files = [];
    },
  },
});

export const { addUnfilteredFile, removeUnfilteredFile, clearUnfiltered } =
  unfilteredSlice.actions;
export default unfilteredSlice.reducer;
