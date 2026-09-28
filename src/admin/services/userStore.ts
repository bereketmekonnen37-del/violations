/**
 * In-memory user repository.
 *
 * The user service uses this repository to satisfy read/write requests. It is
 * intentionally minimal: no persistence, no external calls, just plain
 * objects.
 */

import { deepClone } from '../utils/deepClone';
import { seedDataset } from '../mock/seed';
import type { AdminUser } from '../types/user.types';

let records: AdminUser[] | undefined;

function ensureLoaded(): AdminUser[] {
  if (!records) {
    records = seedDataset().users.map((entry) => deepClone(entry));
  }
  return records;
}

export function listAll(): AdminUser[] {
  return ensureLoaded().map((entry) => deepClone(entry));
}

export function getById(id: string): AdminUser | undefined {
  const found = ensureLoaded().find((entry) => entry.id === id);
  return found ? deepClone(found) : undefined;
}

export function insert(user: AdminUser): AdminUser {
  const list = ensureLoaded();
  const copy = deepClone(user);
  list.unshift(copy);
  return deepClone(copy);
}

export function replace(user: AdminUser): AdminUser | undefined {
  const list = ensureLoaded();
  const index = list.findIndex((entry) => entry.id === user.id);
  if (index === -1) return undefined;
  list[index] = deepClone(user);
  return deepClone(list[index]);
}

export function remove(id: string): boolean {
  const list = ensureLoaded();
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) return false;
  list.splice(index, 1);
  return true;
}

export function findByEmail(email: string): AdminUser | undefined {
  const target = email.trim().toLowerCase();
  const found = ensureLoaded().find(
    (entry) => entry.contact.primaryEmail.toLowerCase() === target,
  );
  return found ? deepClone(found) : undefined;
}

export function resetStoreForTests(): void {
  records = undefined;
}
