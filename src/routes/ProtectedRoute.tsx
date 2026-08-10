import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/store';
import type { UserRole } from '../types';

interface Props {
  children: ReactNode;
  allow?: UserRole[];
  /**
   * When the route is boss-only, set this to true to also allow staff that
   * have been assigned transporters (they get the boss view scoped to their
   * transporters). Rules & User Management stay boss-only.
   */
  allowTransporterStaff?: boolean;
  /**
   * When true, staff users that have been assigned transporters are blocked
   * even if `allow` includes 'staff'. Used to keep /upload restricted to the
   * legacy uploader-style staff role.
   */
  denyTransporterStaff?: boolean;
}

export const ProtectedRoute = ({
  children,
  allow,
  allowTransporterStaff,
  denyTransporterStaff,
}: Props) => {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const isTransporterStaff =
    user.role === 'staff' && (user.assignedTransporters?.length ?? 0) > 0;

  if (allow && !allow.includes(user.role)) {
    if (!(allowTransporterStaff && isTransporterStaff)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  if (denyTransporterStaff && isTransporterStaff) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
