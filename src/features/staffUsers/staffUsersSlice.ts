import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ManagedStaffUser, StaffUsersState } from '../../types';

const initialState: StaffUsersState = { users: [] };

const normalizeTransporters = (list: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  list.forEach((raw) => {
    const t = raw.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  });
  return out;
};

const staffUsersSlice = createSlice({
  name: 'staffUsers',
  initialState,
  reducers: {
    addStaffUser(state, action: PayloadAction<ManagedStaffUser>) {
      const email = action.payload.email.trim().toLowerCase();
      if (state.users.some((u) => u.email.toLowerCase() === email)) return;
      state.users.unshift({
        ...action.payload,
        email: action.payload.email.trim(),
        name: action.payload.name.trim(),
        assignedTransporters: normalizeTransporters(action.payload.assignedTransporters),
      });
    },
    updateStaffUser(
      state,
      action: PayloadAction<{
        id: string;
        name?: string;
        email?: string;
        password?: string;
        assignedTransporters?: string[];
      }>,
    ) {
      const u = state.users.find((x) => x.id === action.payload.id);
      if (!u) return;
      if (action.payload.name !== undefined) u.name = action.payload.name.trim();
      if (action.payload.email !== undefined) u.email = action.payload.email.trim();
      if (action.payload.password !== undefined && action.payload.password.length > 0) {
        u.password = action.payload.password;
      }
      if (action.payload.assignedTransporters !== undefined) {
        u.assignedTransporters = normalizeTransporters(action.payload.assignedTransporters);
      }
    },
    removeStaffUser(state, action: PayloadAction<string>) {
      state.users = state.users.filter((u) => u.id !== action.payload);
    },
  },
});

export const { addStaffUser, updateStaffUser, removeStaffUser } = staffUsersSlice.actions;
export default staffUsersSlice.reducer;
