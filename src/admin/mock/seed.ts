/**
 * Static mock dataset entry point.
 *
 * Consumers pull the seed lazily. This keeps startup work off the critical
 * path when the admin bundle is imported.
 */

import { buildAuditRecords } from './auditFactory';
import { buildUsers } from './userFactory';
import type { AdminAuditRecord } from '../types/audit.types';
import type { AdminUser } from '../types/user.types';

interface SeedResult {
  users: AdminUser[];
  audit: AdminAuditRecord[];
}

let cached: SeedResult | undefined;

export function seedDataset(): SeedResult {
  if (cached) return cached;
  const users = buildUsers({ count: 240, seed: 314 });
  const audit = buildAuditRecords(users, 720, 271);
  cached = { users, audit };
  return cached;
}

export function resetSeedForTests(): void {
  cached = undefined;
}
