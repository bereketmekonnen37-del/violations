import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  createMigrate,
  persistReducer,
  persistStore,
} from 'redux-persist';
import type { PersistedState } from 'redux-persist';
import storage from '../lib/chromeStorage';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import authReducer from '../features/auth/authSlice';
import themeReducer from '../features/theme/themeSlice';
import uploadsReducer from '../features/uploads/uploadsSlice';
import profileReducer from '../features/settings/profileSlice';
import unfilteredReducer from '../features/unfiltered/unfilteredSlice';
import unfilteredNightsReducer from '../features/unfilteredNights/unfilteredNightsSlice';
import unfilteredContinuousReducer from '../features/unfilteredContinuous/unfilteredContinuousSlice';
import driversReducer from '../features/drivers/driversSlice';
import rulesReducer from '../features/rules/rulesSlice';
import staffUsersReducer from '../features/staffUsers/staffUsersSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  uploads: uploadsReducer,
  profile: profileReducer,
  unfiltered: unfilteredReducer,
  unfilteredNights: unfilteredNightsReducer,
  unfilteredContinuous: unfilteredContinuousReducer,
  drivers: driversReducer,
  rules: rulesReducer,
  staffUsers: staffUsersReducer,
});

// Migration 2: `rules.allowedVids: string[]` became
// `rules.allowedVidsByType: { speed, nights, continuous }` so each violation
// source can whitelist independently. Copy any legacy list into all three so
// existing users keep the same behavior on first load.
// Migration 3: same split for `rules.allowedLocations` → `allowedLocationsByType`.
const migrations = {
  2: (persisted: PersistedState): PersistedState => {
    if (!persisted) return persisted;
    const anyState = persisted as unknown as Record<string, unknown>;
    const rules = anyState.rules as Record<string, unknown> | undefined;
    if (!rules) return persisted;
    if (rules.allowedVidsByType) return persisted;
    const legacy = Array.isArray(rules.allowedVids)
      ? (rules.allowedVids as string[])
      : [];
    return {
      ...anyState,
      rules: {
        ...rules,
        allowedVidsByType: {
          speed: [...legacy],
          nights: [...legacy],
          continuous: [...legacy],
        },
        allowedVids: undefined,
      },
    } as unknown as PersistedState;
  },
  3: (persisted: PersistedState): PersistedState => {
    if (!persisted) return persisted;
    const anyState = persisted as unknown as Record<string, unknown>;
    const rules = anyState.rules as Record<string, unknown> | undefined;
    if (!rules) return persisted;
    if (rules.allowedLocationsByType) return persisted;
    const legacy = Array.isArray(rules.allowedLocations)
      ? (rules.allowedLocations as string[])
      : [];
    return {
      ...anyState,
      rules: {
        ...rules,
        allowedLocationsByType: {
          speed: [...legacy],
          nights: [...legacy],
          continuous: [...legacy],
        },
        allowedLocations: undefined,
      },
    } as unknown as PersistedState;
  },
};

const persistedReducer = persistReducer(
  {
    key: 'fleetwatch',
    version: 3,
    storage,
    whitelist: [
      'auth',
      'theme',
      'uploads',
      'profile',
      'unfiltered',
      'unfilteredNights',
      'unfilteredContinuous',
      'drivers',
      'rules',
      'staffUsers',
    ],
    migrate: createMigrate(migrations, { debug: false }),
  },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
