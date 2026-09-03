import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, User } from '../../types';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  initializing: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.initializing = false;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.initializing = false;
    },
    updateProfile(state, action: PayloadAction<Partial<Pick<User, 'name' | 'email' | 'avatar'>>>) {
      if (!state.user) return;
      state.user = { ...state.user, ...action.payload };
    },
  },
});

export const { loginSuccess, logout, updateProfile } = authSlice.actions;
export default authSlice.reducer;
