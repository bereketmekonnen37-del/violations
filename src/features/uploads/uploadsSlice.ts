import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UploadsState, ViolationFile } from '../../types';

const initialState: UploadsState = { files: [] };

const uploadsSlice = createSlice({
  name: 'uploads',
  initialState,
  reducers: {
    addFile(state, action: PayloadAction<ViolationFile>) {
      state.files.unshift(action.payload);
    },
    removeFile(state, action: PayloadAction<string>) {
      state.files = state.files.filter((f) => f.id !== action.payload);
    },
    clearAll(state) {
      state.files = [];
    },
  },
});

export const { addFile, removeFile, clearAll } = uploadsSlice.actions;
export default uploadsSlice.reducer;
