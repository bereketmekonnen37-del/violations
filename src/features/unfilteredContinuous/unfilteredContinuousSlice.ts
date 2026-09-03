import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  RemoteLoadStatus,
  UnfilteredContinuousFile,
  UnfilteredContinuousState,
} from '../../types';

const initialState: UnfilteredContinuousState = { files: [], status: 'idle', error: null };

const slice = createSlice({
  name: 'unfilteredContinuous',
  initialState,
  reducers: {
    addContinuousFile(state, action: PayloadAction<UnfilteredContinuousFile>) {
      state.files.unshift(action.payload);
    },
    removeContinuousFile(state, action: PayloadAction<string>) {
      state.files = state.files.filter((f) => f.id !== action.payload);
    },
    setContinuousFiles(state, action: PayloadAction<UnfilteredContinuousFile[]>) {
      state.files = action.payload;
      state.status = 'loaded';
      state.error = null;
    },
    setContinuousStatus(state, action: PayloadAction<RemoteLoadStatus>) {
      state.status = action.payload;
    },
    setContinuousError(state, action: PayloadAction<string | null>) {
      state.status = 'error';
      state.error = action.payload;
    },
    clearContinuous(state) {
      state.files = [];
      state.status = 'idle';
      state.error = null;
    },
  },
});

export const {
  addContinuousFile,
  removeContinuousFile,
  setContinuousFiles,
  setContinuousStatus,
  setContinuousError,
  clearContinuous,
} = slice.actions;
export default slice.reducer;
