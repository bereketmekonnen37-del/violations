import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';
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

const persistedReducer = persistReducer(
  {
    key: 'fleetwatch',
    version: 1,
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
