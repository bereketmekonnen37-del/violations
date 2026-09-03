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
import nightMergeReducer from '../features/settings/nightMergeSlice';

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
  nightMerge: nightMergeReducer,
});

// Migration 2: `rules.allowedVids: string[]` became
// `rules.allowedVidsByType: { speed, nights, continuous }` so each violation
// source can whitelist independently. Copy any legacy list into all three so
// existing users keep the same behavior on first load.
// Migration 3: same split for `rules.allowedLocations` → `allowedLocationsByType`.
// Migration 4: entries went from `string[]` to `{ vid, dates: [] }[]` so each
// allowed VID can optionally be scoped to specific event days.
// Migration 5: same shape upgrade for `allowedLocationsByType` entries
// (`string[]` → `{ value, dates: [] }[]`).
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
  4: (persisted: PersistedState): PersistedState => {
    if (!persisted) return persisted;
    const anyState = persisted as unknown as Record<string, unknown>;
    const rules = anyState.rules as Record<string, unknown> | undefined;
    if (!rules) return persisted;
    const bucket = rules.allowedVidsByType as
      | Record<string, unknown>
      | undefined;
    if (!bucket) return persisted;
    const upgrade = (list: unknown): Array<{ vid: string; dates: string[] }> => {
      if (!Array.isArray(list)) return [];
      return list
        .map((item) => {
          if (typeof item === 'string') {
            return { vid: item, dates: [] };
          }
          if (item && typeof item === 'object' && 'vid' in item) {
            const rec = item as { vid?: unknown; dates?: unknown };
            const vid = typeof rec.vid === 'string' ? rec.vid : '';
            const dates = Array.isArray(rec.dates)
              ? (rec.dates.filter((d) => typeof d === 'string') as string[])
              : [];
            return vid ? { vid, dates } : null;
          }
          return null;
        })
        .filter((x): x is { vid: string; dates: string[] } => x !== null);
    };
    return {
      ...anyState,
      rules: {
        ...rules,
        allowedVidsByType: {
          speed: upgrade(bucket.speed),
          nights: upgrade(bucket.nights),
          continuous: upgrade(bucket.continuous),
        },
      },
    } as unknown as PersistedState;
  },
  5: (persisted: PersistedState): PersistedState => {
    if (!persisted) return persisted;
    const anyState = persisted as unknown as Record<string, unknown>;
    const rules = anyState.rules as Record<string, unknown> | undefined;
    if (!rules) return persisted;
    const bucket = rules.allowedLocationsByType as
      | Record<string, unknown>
      | undefined;
    if (!bucket) return persisted;
    const upgrade = (
      list: unknown,
    ): Array<{ value: string; dates: string[] }> => {
      if (!Array.isArray(list)) return [];
      return list
        .map((item) => {
          if (typeof item === 'string') {
            return { value: item, dates: [] };
          }
          if (item && typeof item === 'object' && 'value' in item) {
            const rec = item as { value?: unknown; dates?: unknown };
            const value = typeof rec.value === 'string' ? rec.value : '';
            const dates = Array.isArray(rec.dates)
              ? (rec.dates.filter((d) => typeof d === 'string') as string[])
              : [];
            return value ? { value, dates } : null;
          }
          return null;
        })
        .filter((x): x is { value: string; dates: string[] } => x !== null);
    };
    return {
      ...anyState,
      rules: {
        ...rules,
        allowedLocationsByType: {
          speed: upgrade(bucket.speed),
          nights: upgrade(bucket.nights),
          continuous: upgrade(bucket.continuous),
        },
      },
    } as unknown as PersistedState;
  },
};

const persistedReducer = persistReducer(
  {
    key: 'fleetwatch',
    version: 5,
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
      'nightMerge',
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
