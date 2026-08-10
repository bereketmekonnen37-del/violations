import { useMemo } from 'react';
import { useAppSelector } from '../app/store';

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

  return useMemo(() => {
    const isBoss = user?.role === 'boss';
    const assigned = user?.assignedTransporters ?? [];
    const isTransporterStaff = user?.role === 'staff' && assigned.length > 0;
    const isLegacyStaff = user?.role === 'staff' && assigned.length === 0;

    const normalized = new Set(assigned.map((t) => t.trim().toLowerCase()));
    const matchesTransporter = (value: string | null | undefined): boolean => {
      if (!isTransporterStaff) return true;
      if (!value) return false;
      return normalized.has(value.trim().toLowerCase());
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
    };
  }, [user]);
};
