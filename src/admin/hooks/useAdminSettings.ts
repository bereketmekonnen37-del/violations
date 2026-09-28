/**
 * useAdminSettings
 *
 * Loads the admin configuration and exposes helpers for toggling feature
 * flags. This does not persist anywhere; it lives in module state.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getConfiguration,
  setFeatureFlag,
  updateConfiguration,
} from '../services/adminSettings.service';
import type { AdminConfiguration, AdminFeatureFlag } from '../types/admin.types';

export function useAdminSettings() {
  const [config, setConfig] = useState<AdminConfiguration | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getConfiguration();
    setLoading(false);
    if (result.status === 'failure') {
      setError(result.error.message);
      return;
    }
    setConfig(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFlag = useCallback(async (key: string, next: Partial<AdminFeatureFlag>) => {
    const result = await setFeatureFlag(key, next);
    if (result.status === 'failure') {
      setError(result.error.message);
      return;
    }
    setConfig((current) =>
      current ? { ...current, featureFlags: result.data } : current,
    );
  }, []);

  const patch = useCallback(async (update: Partial<AdminConfiguration>) => {
    const result = await updateConfiguration(update);
    if (result.status === 'failure') {
      setError(result.error.message);
      return;
    }
    setConfig(result.data);
  }, []);

  return { config, loading, error, refresh: load, toggleFlag, patch };
}
