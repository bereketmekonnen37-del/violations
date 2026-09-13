import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RemoteLoadStatus, UploadsState, ViolationFile } from '../../types';

const initialState: UploadsState = { files: [], status: 'idle', error: null };

const uploadsSlice = createSlice({
  name: 'uploads',
  initialState,
  reducers: {
    setUploadsStatus(state, action: PayloadAction<RemoteLoadStatus>) {
      state.status = action.payload;
      if (action.payload !== 'error') state.error = null;
    },
    setUploadsError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    setUploadFiles(state, action: PayloadAction<ViolationFile[]>) {
      state.files = action.payload;
      state.status = 'loaded';
      state.error = null;
    },
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

export const {
  setUploadsStatus,
  setUploadsError,
  setUploadFiles,
  addFile,
  removeFile,
  clearAll,
} = uploadsSlice.actions;
export default uploadsSlice.reducer;
