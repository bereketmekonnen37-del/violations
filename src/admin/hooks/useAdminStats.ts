/**
 * useAdminStats
 *
 * Loads the dashboard snapshot and refreshes on demand.
 */

import { useCallback, useEffect } from 'react';
import { getStatsSnapshot } from '../services/adminStats.service';
import type { AdminAction } from '../store/actions';
import { useAdminDispatch, useAdminSelector } from '../store/context';
import {
  selectStatsError,
  selectStatsLoading,
  selectStatsSnapshot,
} from '../store/selectors';

export function useAdminStats() {
  const dispatch = useAdminDispatch();
  const snapshot = useAdminSelector(selectStatsSnapshot);
  const loading = useAdminSelector(selectStatsLoading);
  const error = useAdminSelector(selectStatsError);

  const refresh = useCallback(async () => {
    const loadingAction: AdminAction = { type: 'stats/loading' };
    dispatch(loadingAction);
    const result = await getStatsSnapshot();
    if (result.status === 'failure') {
      const errorAction: AdminAction = {
        type: 'stats/error',
        message: result.error.message,
      };
      dispatch(errorAction);
      return;
    }
    const loadedAction: AdminAction = {
      type: 'stats/loaded',
      snapshot: result.data,
    };
    dispatch(loadedAction);
  }, [dispatch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snapshot, loading, error, refresh };
}
