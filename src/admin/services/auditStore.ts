/**
 * In-memory audit log.
 *
 * Every service mutation is appended here as a new record. The store never
 * mutates existing entries which mirrors the shape of the eventual audit
 * table.
 */

import { deepClone } from '../utils/deepClone';
import { seedDataset } from '../mock/seed';
import type { AdminAuditRecord } from '../types/audit.types';

let records: AdminAuditRecord[] | undefined;

function ensureLoaded(): AdminAuditRecord[] {
  if (!records) {
    records = seedDataset().audit.map((entry) => deepClone(entry));
  }
  return records;
}

export function appendRecord(record: AdminAuditRecord): AdminAuditRecord {
  const list = ensureLoaded();
  const copy = deepClone(record);
  list.unshift(copy);
  return deepClone(copy);
}

export function listAllAudit(): AdminAuditRecord[] {
  return ensureLoaded().map((entry) => deepClone(entry));
}

export function getAuditById(id: string): AdminAuditRecord | undefined {
  const found = ensureLoaded().find((entry) => entry.id === id);
  return found ? deepClone(found) : undefined;
}

export function resetAuditStoreForTests(): void {
  records = undefined;
}
