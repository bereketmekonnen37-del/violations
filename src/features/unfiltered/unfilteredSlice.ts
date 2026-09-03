import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RemoteLoadStatus, UnfilteredFile, UnfilteredState } from '../../types';

const initialState: UnfilteredState = { files: [], status: 'idle', error: null };

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
    setUnfilteredFiles(state, action: PayloadAction<UnfilteredFile[]>) {
      state.files = action.payload;
      state.status = 'loaded';
      state.error = null;
    },
    setUnfilteredStatus(state, action: PayloadAction<RemoteLoadStatus>) {
      state.status = action.payload;
    },
    setUnfilteredError(state, action: PayloadAction<string | null>) {
      state.status = 'error';
      state.error = action.payload;
    },
    clearUnfiltered(state) {
      state.files = [];
      state.status = 'idle';
      state.error = null;
    },
  },
});

export const {
  addUnfilteredFile,
  removeUnfilteredFile,
  setUnfilteredFiles,
  setUnfilteredStatus,
  setUnfilteredError,
  clearUnfiltered,
} = unfilteredSlice.actions;
export default unfilteredSlice.reducer;
