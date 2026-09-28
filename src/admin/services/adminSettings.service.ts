/**
 * Settings service.
 *
 * Exposes a small in-memory settings object and feature flag toggles. The
 * dashboard reads and writes through this service so the store never
 * touches the underlying data directly.
 */

import {
  ADMIN_AUDIT_RETENTION_DAYS,
  ADMIN_BRAND_ACCENT,
  ADMIN_BRAND_PRIMARY,
  ADMIN_DEFAULT_PAGE_SIZE,
  ADMIN_PRODUCT_NAME,
  ADMIN_SUPPORT_EMAIL,
} from '../utils/constants';
import type { AdminApiResult } from '../types/api.types';
import type {
  AdminConfiguration,
  AdminFeatureFlag,
} from '../types/admin.types';
import { runRequest } from './httpClient';

let config: AdminConfiguration = {
  environment: 'development',
  release: '2026.09-admin',
  supportEmail: ADMIN_SUPPORT_EMAIL,
  featureFlags: [
    {
      key: 'admin.remove-user',
      label: 'Enable user removal',
      description: 'Allow admins to permanently remove accounts.',
      enabled: true,
      rolloutPercent: 100,
      updatedAt: new Date().toISOString(),
    },
    {
      key: 'admin.impersonation',
      label: 'Enable impersonation',
      description: 'Allow admins to sign in as another user.',
      enabled: false,
      rolloutPercent: 0,
      updatedAt: new Date().toISOString(),
    },
    {
      key: 'admin.export-csv',
      label: 'CSV exports',
      description: 'Enable CSV export from the users and audit pages.',
      enabled: true,
      rolloutPercent: 100,
      updatedAt: new Date().toISOString(),
    },
    {
      key: 'admin.analytics-preview',
      label: 'Analytics preview',
      description: 'Show the extended analytics dashboard.',
      enabled: true,
      rolloutPercent: 100,
      updatedAt: new Date().toISOString(),
    },
    {
      key: 'admin.system-health',
      label: 'System health page',
      description: 'Show a page with mocked service health checks.',
      enabled: true,
      rolloutPercent: 100,
      updatedAt: new Date().toISOString(),
    },
  ],
  defaultPageSize: ADMIN_DEFAULT_PAGE_SIZE,
  auditRetentionDays: ADMIN_AUDIT_RETENTION_DAYS,
  branding: {
    primaryColor: ADMIN_BRAND_PRIMARY,
    accentColor: ADMIN_BRAND_ACCENT,
    productName: ADMIN_PRODUCT_NAME,
  },
};

export function getConfiguration(): Promise<AdminApiResult<AdminConfiguration>> {
  return runRequest(() => ({ ...config, featureFlags: config.featureFlags.map((flag) => ({ ...flag })) }));
}

export function updateConfiguration(
  patch: Partial<AdminConfiguration>,
): Promise<AdminApiResult<AdminConfiguration>> {
  return runRequest(() => {
    config = {
      ...config,
      ...patch,
      branding: { ...config.branding, ...(patch.branding ?? {}) },
    };
    return { ...config };
  });
}

export function setFeatureFlag(
  key: string,
  update: Partial<AdminFeatureFlag>,
): Promise<AdminApiResult<AdminFeatureFlag[]>> {
  return runRequest(() => {
    config = {
      ...config,
      featureFlags: config.featureFlags.map((flag) =>
        flag.key === key
          ? { ...flag, ...update, updatedAt: new Date().toISOString() }
          : flag,
      ),
    };
    return config.featureFlags.map((flag) => ({ ...flag }));
  });
}
