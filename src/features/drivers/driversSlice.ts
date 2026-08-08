import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DriversDataState, DriverRecord, UnfilteredFileKind } from '../../types';

const initialState: DriversDataState = {
  period: '',
  uploadedAt: null,
  uploaderId: null,
  uploaderName: null,
  fileName: null,
  fileType: null,
  records: [],
};

interface ReplaceDriversPayload {
  period: string;
  uploaderId: string;
  uploaderName: string;
  fileName: string;
  fileType: UnfilteredFileKind;
  records: DriverRecord[];
}

const driversSlice = createSlice({
  name: 'drivers',
  initialState,
  reducers: {
    replaceDrivers(state, action: PayloadAction<ReplaceDriversPayload>) {
      const { period, uploaderId, uploaderName, fileName, fileType, records } =
        action.payload;
      state.period = period;
      state.uploaderId = uploaderId;
      state.uploaderName = uploaderName;
      state.fileName = fileName;
      state.fileType = fileType;
      state.records = records;
      state.uploadedAt = new Date().toISOString();
    },
    updatePeriod(state, action: PayloadAction<string>) {
      state.period = action.payload;
    },
    updateDriverRecord(
      state,
      action: PayloadAction<{
        id: string;
        vid: string;
        driverName: string;
        transporter: string;
      }>,
    ) {
      const r = state.records.find((rec) => rec.id === action.payload.id);
      if (r) {
        r.vid = action.payload.vid;
        r.driverName = action.payload.driverName;
        r.transporter = action.payload.transporter;
      }
    },
    addDriverRecord(state, action: PayloadAction<DriverRecord>) {
      state.records.unshift(action.payload);
    },
    removeDriverRecord(state, action: PayloadAction<string>) {
      state.records = state.records.filter((r) => r.id !== action.payload);
    },
    clearDrivers() {
      return initialState;
    },
  },
});

export const {
  replaceDrivers,
  updatePeriod,
  updateDriverRecord,
  addDriverRecord,
  removeDriverRecord,
  clearDrivers,
} = driversSlice.actions;
export default driversSlice.reducer;
