/**
 * Mock user factory.
 *
 * Generates a deterministic collection of admin user records covering
 * every role and status. Consumers can override individual fields to make
 * specific scenarios in tests or storybook-like previews.
 */

import { addDays } from '../utils/dateUtils';
import { generateUserId } from '../utils/id';
import { defaultScopesForRole } from '../utils/permissions';
import type {
  AdminUser,
  AdminUserPermissions,
  AdminUserPreferences,
  AdminUserRole,
  AdminUserStatus,
} from '../types/user.types';
import { createRandom } from './random';
import {
  CITIES,
  FIRST_NAMES,
  IP_POOL,
  LAST_NAMES,
  NOTE_TEMPLATES,
  STATES,
  TAG_POOL,
  TRANSPORTERS,
} from './seedNames';

interface UserFactoryOptions {
  count: number;
  seed?: number;
  now?: Date;
}

const ROLE_MIX: AdminUserRole[] = [
  'staff', 'staff', 'staff', 'staff', 'staff',
  'staff', 'staff', 'staff', 'staff', 'staff',
  'staff', 'staff', 'staff', 'staff', 'staff',
  'boss', 'boss', 'boss', 'boss', 'boss',
  'boss', 'boss',
  'admin', 'admin',
  'super_admin',
];

const STATUS_MIX: AdminUserStatus[] = [
  'active', 'active', 'active', 'active', 'active',
  'active', 'active', 'active', 'active', 'active',
  'active', 'active', 'active', 'active', 'active',
  'invited', 'invited', 'invited',
  'suspended', 'suspended',
  'archived',
  'pending_verification',
];

function permissionsFor(role: AdminUserRole): AdminUserPermissions {
  const scopes = defaultScopesForRole(role);
  return {
    canManageStaff: role === 'boss' || role === 'admin' || role === 'super_admin',
    canManageBosses: role === 'admin' || role === 'super_admin',
    canManageAdmins: role === 'super_admin',
    canExportData: role !== 'staff',
    canViewAuditLog: role === 'admin' || role === 'super_admin',
    canAssignTransporters: role !== 'staff',
    canConfigureRules: role === 'boss' || role === 'admin' || role === 'super_admin',
    canImpersonate: scopes.some((entry) => entry === 'admin:impersonate'),
  };
}

function preferencesFor(seed: number): AdminUserPreferences {
  return {
    timezone: 'America/New_York',
    language: seed % 5 === 0 ? 'es-US' : 'en-US',
    dashboardDensity:
      seed % 3 === 0 ? 'compact' : seed % 3 === 1 ? 'cozy' : 'comfortable',
    emailDigestFrequency:
      seed % 4 === 0 ? 'daily' : seed % 4 === 1 ? 'weekly' : 'monthly',
    showTutorials: seed % 5 !== 0,
    darkMode: seed % 2 === 0,
  };
}

export function buildUser(overrides: Partial<AdminUser> = {}, seed = 1): AdminUser {
  const random = createRandom(seed || 1);
  const first = random.pick(FIRST_NAMES);
  const last = random.pick(LAST_NAMES);
  const displayName = overrides.displayName ?? `${first} ${last}`;
  const role = overrides.role ?? random.pick(ROLE_MIX);
  const status = overrides.status ?? random.pick(STATUS_MIX);
  const now = new Date();
  const createdAt = addDays(now, -random.int(1, 400)).toISOString();
  const updatedAt = addDays(new Date(createdAt), random.int(0, 30)).toISOString();
  const primaryEmail = `${first}.${last}${random.int(1, 999)}`
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '') +
    '@example.com';
  const transporters = random.sample(TRANSPORTERS, random.int(0, 3));
  const tags = random.sample(TAG_POOL, random.int(0, 3));
  const lastLoginAt = status === 'active' && random.bool(0.85)
    ? addDays(now, -random.int(0, 30)).toISOString()
    : undefined;

  return {
    id: overrides.id ?? generateUserId(),
    displayName,
    role,
    status,
    contact: {
      primaryEmail,
      secondaryEmail:
        random.bool(0.2) ? `${first}.${last}.alt@example.com`.toLowerCase() : undefined,
      phone: random.bool(0.75)
        ? `+1${random.int(200, 999)}${random.int(200, 999)}${random.int(1000, 9999)}`
        : undefined,
      smsEnabled: random.bool(0.6),
      address: random.bool(0.7)
        ? {
            line1: `${random.int(1, 9999)} ${random.pick(LAST_NAMES)} Street`,
            city: random.pick(CITIES),
            state: random.pick(STATES),
            postalCode: `${random.int(10000, 99999)}`,
            country: 'US',
          }
        : undefined,
    },
    audit: {
      createdAt,
      updatedAt,
      lastLoginAt,
      lastLoginIp: lastLoginAt ? random.pick(IP_POOL) : undefined,
      createdBy: random.bool(0.5) ? generateUserId() : undefined,
      updatedBy: random.bool(0.3) ? generateUserId() : undefined,
    },
    permissions: permissionsFor(role),
    preferences: preferencesFor(seed),
    transporters,
    tags,
    notes: random.bool(0.4) ? random.pick(NOTE_TEMPLATES) : undefined,
    ...overrides,
  };
}

export function buildUsers(options: UserFactoryOptions): AdminUser[] {
  const baseSeed = options.seed ?? 42;
  const users: AdminUser[] = [];
  for (let i = 0; i < options.count; i += 1) {
    users.push(buildUser({}, baseSeed + i * 17));
  }
  return users;
}
