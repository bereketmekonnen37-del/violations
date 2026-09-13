import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ManagedStaffUser, RemoteLoadStatus, StaffUsersState } from '../../types';

const initialState: StaffUsersState = { users: [], status: 'idle', error: null };

const staffUsersSlice = createSlice({
  name: 'staffUsers',
  initialState,
  reducers: {
    setStaffUsersStatus(state, action: PayloadAction<RemoteLoadStatus>) {
      state.status = action.payload;
      if (action.payload !== 'error') state.error = null;
    },
    setStaffUsersError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    setStaffUsers(state, action: PayloadAction<ManagedStaffUser[]>) {
      state.users = action.payload;
      state.status = 'loaded';
      state.error = null;
    },
    upsertStaffUser(state, action: PayloadAction<ManagedStaffUser>) {
      const i = state.users.findIndex((u) => u.id === action.payload.id);
      if (i >= 0) state.users[i] = action.payload;
      else state.users.unshift(action.payload);
    },
    removeStaffUserLocal(state, action: PayloadAction<string>) {
      state.users = state.users.filter((u) => u.id !== action.payload);
    },
  },
});

export const {
  setStaffUsersStatus,
  setStaffUsersError,
  setStaffUsers,
  upsertStaffUser,
  removeStaffUserLocal,
} = staffUsersSlice.actions;
export default staffUsersSlice.reducer;
