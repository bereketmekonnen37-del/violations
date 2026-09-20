import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { fetchAppRules, saveAppRules } from '../features/rules/rulesApi';
import { hydrateRules } from '../features/rules/rulesSlice';
import {
  bulkSeedMasterFleetStatus,
  fetchMasterFleetStatus,
} from '../features/masterFleet/masterFleetStatusApi';
import { hydrateMasterFleetStatus } from '../features/masterFleet/masterFleetStatusSlice';
import { fetchDriverRoster, seedDriverRoster } from '../features/drivers/driversApi';
import {
  hydrateDrivers,
  setDriversError,
  setDriversStatus,
} from '../features/drivers/driversSlice';
import { fetchViolationFiles } from '../features/uploads/uploadsApi';
import {
  setUploadFiles,
  setUploadsError,
  setUploadsStatus,
} from '../features/uploads/uploadsSlice';

/**
 * Mounted once near the app root, alongside `useUnfilteredBootstrap`. Loads
 * every remaining shared dataset from Supabase — Rules, Master Fleet
 * recommended-action status, the monthly Drivers roster, and legacy
 * Filtered Violations files — so boss and staff sessions stay in sync
 * instead of each browser holding its own local copy.
 *
 * The first boss to load the app after this migration seeds each table
 * from whatever was already sitting in their browser's local copy (if the
 * table is still empty), so pre-existing Rules/Master-Fleet-status/Drivers
 * configuration isn't silently lost.
 */
export const useAppDataBootstrap = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const initializing = useAppSelector((s) => s.auth.initializing);
  const isBoss = useAppSelector((s) => s.auth.user?.role === 'boss');
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);

  const localRules = useAppSelector((s) => s.rules);
  const localMasterFleetStatus = useAppSelector((s) => s.masterFleetStatus.statusByVid);
  const localDrivers = useAppSelector((s) => s.drivers);

  const localRulesRef = useRef(localRules);
  localRulesRef.current = localRules;
  const localMasterFleetStatusRef = useRef(localMasterFleetStatus);
  localMasterFleetStatusRef.current = localMasterFleetStatus;
  const localDriversRef = useRef(localDrivers);
  localDriversRef.current = localDrivers;

  useEffect(() => {
    if (initializing || !isAuthenticated || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchAppRules();
        if (cancelled) return;
        if (remote) {
          dispatch(hydrateRules(remote));
        } else {
          const local = localRulesRef.current;
          const payload = {
            thresholds: local.thresholds,
            allowedVidsByType: local.allowedVidsByType,
            allowedLocationsByType: local.allowedLocationsByType,
            maxDurationSeconds: local.maxDurationSeconds,
            underestimatedRule: local.underestimatedRule ?? null,
          };
          if (isBoss) {
            try {
              await saveAppRules(payload, userId);
            } catch {
              // Non-fatal — the boss can still edit and save from the
              // Rules page; this was just an opportunistic first seed.
            }
          }
          dispatch(hydrateRules(payload));
        }
      } catch {
        // Keep whatever local rules exist; Dashboard/Master Fleet still
        // work off the current Redux state.
      }
    })();

    (async () => {
      try {
        const remote = await fetchMasterFleetStatus();
        if (cancelled) return;
        if (Object.keys(remote).length > 0) {
          dispatch(hydrateMasterFleetStatus(remote));
        } else {
          const local = localMasterFleetStatusRef.current;
          if (isBoss && Object.keys(local).length > 0) {
            try {
              await bulkSeedMasterFleetStatus(local, userId);
            } catch {
              // Non-fatal — statuses stay local-only until the next
              // successful sync.
            }
          }
          dispatch(hydrateMasterFleetStatus(local));
        }
      } catch {
        // Keep local statuses as-is.
      }
    })();

    (async () => {
      dispatch(setDriversStatus('loading'));
      try {
        const remote = await fetchDriverRoster();
        if (cancelled) return;
        if (remote.records.length > 0) {
          dispatch(hydrateDrivers(remote));
        } else {
          const local = localDriversRef.current;
          if (isBoss && local.records.length > 0) {
            try {
              await seedDriverRoster(local);
              const seeded = await fetchDriverRoster();
              if (!cancelled) {
                dispatch(hydrateDrivers(seeded));
                return;
              }
            } catch {
              // Fall through to hydrating with the local copy below.
            }
          }
          dispatch(hydrateDrivers(remote));
        }
      } catch (e) {
        if (!cancelled) {
          dispatch(
            setDriversError(
              e instanceof Error ? e.message : 'Could not load the drivers roster.',
            ),
          );
        }
      }
    })();

    (async () => {
      dispatch(setUploadsStatus('loading'));
      try {
        const files = await fetchViolationFiles();
        if (!cancelled) dispatch(setUploadFiles(files));
      } catch (e) {
        if (!cancelled) {
          dispatch(
            setUploadsError(
              e instanceof Error ? e.message : 'Could not load violation files.',
            ),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, initializing, isBoss, userId, dispatch]);
};
