/**
 * Stats service.
 *
 * Derives snapshots and card models on demand from the user repository.
 */

import { computeSnapshot, toCardModels } from '../utils/analytics';
import type { AdminApiResult } from '../types/api.types';
import type {
  AdminStatsCardModel,
  AdminStatsSnapshot,
} from '../types/stats.types';
import { runRequest } from './httpClient';
import { listAll } from './userStore';

export function getStatsSnapshot(): Promise<AdminApiResult<AdminStatsSnapshot>> {
  return runRequest(() => computeSnapshot(listAll()));
}

export function getStatsCards(): Promise<AdminApiResult<AdminStatsCardModel[]>> {
  return runRequest(() => toCardModels(computeSnapshot(listAll())));
}
