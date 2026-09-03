import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  RemoteLoadStatus,
  UnfilteredNightFile,
  UnfilteredNightsState,
} from '../../types';

const initialState: UnfilteredNightsState = { files: [], status: 'idle', error: null };

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
    setNightFiles(state, action: PayloadAction<UnfilteredNightFile[]>) {
      state.files = action.payload;
      state.status = 'loaded';
      state.error = null;
    },
    setNightStatus(state, action: PayloadAction<RemoteLoadStatus>) {
      state.status = action.payload;
    },
    setNightError(state, action: PayloadAction<string | null>) {
      state.status = 'error';
      state.error = action.payload;
    },
    clearNights(state) {
      state.files = [];
      state.status = 'idle';
      state.error = null;
    },
  },
});

export const {
  addNightFile,
  removeNightFile,
  setNightFiles,
  setNightStatus,
  setNightError,
  clearNights,
} = slice.actions;
export default slice.reducer;
