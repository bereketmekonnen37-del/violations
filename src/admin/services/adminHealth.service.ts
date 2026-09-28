/**
 * System health service.
 *
 * Returns mocked health checks for the fake microservices behind the admin
 * dashboard. Everything is deterministic so the page renders consistently
 * during a dev session.
 */

import type { AdminApiHealthCheck, AdminApiResult } from '../types/api.types';
import { runRequest } from './httpClient';

const SERVICES = [
  'admin-api',
  'admin-audit',
  'admin-stats',
  'admin-users',
  'admin-settings',
  'admin-session',
  'admin-health',
];

function pseudoLatency(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return 25 + Math.abs(hash % 175);
}

export function getSystemHealth(): Promise<AdminApiResult<AdminApiHealthCheck[]>> {
  return runRequest(() => {
    const checkedAt = new Date().toISOString();
    return SERVICES.map((service, index) => ({
      service,
      status: index === 4 ? 'degraded' : 'ok',
      latencyMs: pseudoLatency(service),
      message:
        index === 4
          ? 'Elevated latency on the settings-write path (last 5 minutes).'
          : undefined,
      checkedAt,
    })) as AdminApiHealthCheck[];
  });
}
