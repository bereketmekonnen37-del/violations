import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  UnfilteredContinuousFile,
  UnfilteredContinuousState,
} from '../../types';

const initialState: UnfilteredContinuousState = { files: [] };

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
    clearContinuous(state) {
      state.files = [];
    },
  },
});

export const { addContinuousFile, removeContinuousFile, clearContinuous } =
  slice.actions;
export default slice.reducer;
