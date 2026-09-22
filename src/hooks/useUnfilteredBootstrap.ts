import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { fetchUnfilteredFiles } from '../features/unfiltered/unfilteredApi';
import {
  clearUnfiltered,
  setUnfilteredError,
  setUnfilteredFiles,
  setUnfilteredStatus,
} from '../features/unfiltered/unfilteredSlice';
import { fetchNightFiles } from '../features/unfilteredNights/unfilteredNightsApi';
import {
  clearNights,
  setNightError,
  setNightFiles,
  setNightStatus,
} from '../features/unfilteredNights/unfilteredNightsSlice';
import { fetchContinuousFiles } from '../features/unfilteredContinuous/unfilteredContinuousApi';
import {
  clearContinuous,
  setContinuousError,
  setContinuousFiles,
  setContinuousStatus,
} from '../features/unfilteredContinuous/unfilteredContinuousSlice';
import { useUserScope } from './useUserScope';

/**
 * Mounted once near the app root, alongside `useAuthBootstrap`. Loads all
 * three Unfiltered (speed/nights/continuous) datasets from Supabase as soon
 * as a session is confirmed, regardless of which page the user lands on
 * first — Dashboard/Master Fleet read these slices directly and would
 * otherwise stay empty until the raw Unfiltered pages happened to be
 * visited. Clears all three on logout so a shared browser doesn't leak the
 * previous user's cross-device data into the next session.
 *
 * Legacy staff never see uploaded data anywhere in the UI, so we don't fetch
 * it for them — one less RTT on login and no risk of showing their own past
 * uploads back to them.
 */
export const useUnfilteredBootstrap = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const initializing = useAppSelector((s) => s.auth.initializing);
  const { isLegacyStaff } = useUserScope();

  useEffect(() => {
    if (initializing) return;

    if (!isAuthenticated || isLegacyStaff) {
      dispatch(clearUnfiltered());
      dispatch(clearNights());
      dispatch(clearContinuous());
      return;
    }

    let cancelled = false;

    dispatch(setUnfilteredStatus('loading'));
    dispatch(setNightStatus('loading'));
    dispatch(setContinuousStatus('loading'));

    fetchUnfilteredFiles()
      .then((files) => {
        if (!cancelled) dispatch(setUnfilteredFiles(files));
      })
      .catch((e) => {
        if (!cancelled) {
          dispatch(
            setUnfilteredError(
              e instanceof Error ? e.message : 'Could not load unfiltered speed files.',
            ),
          );
        }
      });

    fetchNightFiles()
      .then((files) => {
        if (!cancelled) dispatch(setNightFiles(files));
      })
      .catch((e) => {
        if (!cancelled) {
          dispatch(
            setNightError(
              e instanceof Error ? e.message : 'Could not load unfiltered night files.',
            ),
          );
        }
      });

    fetchContinuousFiles()
      .then((files) => {
        if (!cancelled) dispatch(setContinuousFiles(files));
      })
      .catch((e) => {
        if (!cancelled) {
          dispatch(
            setContinuousError(
              e instanceof Error ? e.message : 'Could not load unfiltered continuous files.',
            ),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, initializing, isLegacyStaff, dispatch]);
};
