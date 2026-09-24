import { useMemo } from 'react';
import { useAppSelector } from '../app/store';
import { normalizeVid } from '../lib/locationRules';

/**
 * A "transporter-scoped" user is a staff user created from the boss's
 * User Management page. They get the boss UI, but every data view is
 * limited to the transporters they were assigned.
 *
 * Legacy staff (staff@demo.com — no assigned transporters) keeps the
 * original uploader-focused UI.
 */
export const useUserScope = () => {
  const user = useAppSelector((s) => s.auth.user);
  const driverRecords = useAppSelector((s) => s.drivers.records);

  return useMemo(() => {
    const isBoss = user?.role === 'boss';
    const assigned = user?.assignedTransporters ?? [];
    const isTransporterStaff = user?.role === 'staff' && assigned.length > 0;
    const isLegacyStaff = user?.role === 'staff' && assigned.length === 0;

    const normalized = new Set(assigned.map((t) => t.trim().toLowerCase()));

    // VID → canonical transporter name, seeded from the boss's Drivers Data
    // roster. This mirrors `transporterAnalytics.resolveTransporter` so the
    // staff filter and the boss's aggregation agree on which VID belongs to
    // which transporter — regardless of what the raw upload cell says.
    const vidToTransporter = new Map<string, string>();
    driverRecords.forEach((r) => {
      const key = normalizeVid(r.vid);
      if (!key) return;
      if (!vidToTransporter.has(key) && r.transporter) {
        vidToTransporter.set(key, r.transporter.trim());
      }
    });

    const matchesTransporter = (value: string | null | undefined): boolean => {
      if (!isTransporterStaff) return true;
      if (!value) return false;
      return normalized.has(value.trim().toLowerCase());
    };

    /**
     * Match a driver block/record against the assigned transporter set using
     * the same canonical resolution the boss aggregation uses:
     *   1. VID → roster transporter (authoritative)
     *   2. block's raw transporter cell
     *   3. driver name as last resort
     * A block with any of those resolving to an assigned transporter passes.
     */
    const matchesBlock = (block: {
      vid?: string | null;
      transporter?: string | null;
      driverName?: string | null;
    }): boolean => {
      if (!isTransporterStaff) return true;
      const vidKey = normalizeVid(block.vid ?? '');
      const canonical = vidKey ? vidToTransporter.get(vidKey) : undefined;
      if (canonical && normalized.has(canonical.trim().toLowerCase())) {
        return true;
      }
      const raw = (block.transporter ?? '').trim().toLowerCase();
      if (raw && normalized.has(raw)) return true;
      const dn = (block.driverName ?? '').trim().toLowerCase();
      if (dn && normalized.has(dn)) return true;
      return false;
    };

    return {
      user,
      isBoss,
      isTransporterStaff,
      isLegacyStaff,
      /** True when this user should see the boss-style pages. */
      hasBossView: isBoss || isTransporterStaff,
      assignedTransporters: assigned,
      matchesTransporter,
      matchesBlock,
    };
  }, [user, driverRecords]);
};
