/**
 * useSystemHealth
 *
 * Polls the mocked health service so the admin system-health page has
 * something to render.
 */

import { useCallback, useEffect, useState } from 'react';
import { getSystemHealth } from '../services/adminHealth.service';
import type { AdminApiHealthCheck } from '../types/api.types';

export function useSystemHealth(pollMs = 15_000) {
  const [checks, setChecks] = useState<AdminApiHealthCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getSystemHealth();
    setLoading(false);
    if (result.status === 'failure') {
      setError(result.error.message);
      return;
    }
    setChecks(result.data);
  }, []);

  useEffect(() => {
    void refresh();
    if (!pollMs) return;
    const interval = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(interval);
  }, [refresh, pollMs]);

  return { checks, loading, error, refresh };
}
