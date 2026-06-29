import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProfileState, Theme } from '../../types';

const initialState: ProfileState = {
  photo: null,
  preferences: {
    theme: 'light',
  },
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setPhoto(state, action: PayloadAction<string | null>) {
      state.photo = action.payload;
    },
    setPreferredTheme(state, action: PayloadAction<Theme>) {
      state.preferences.theme = action.payload;
    },
  },
});

export const { setPhoto, setPreferredTheme } = profileSlice.actions;
export default profileSlice.reducer;
