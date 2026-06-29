import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/store';
import type { UserRole } from '../types';

interface Props {
  children: ReactNode;
  allow?: UserRole[];
}

export const ProtectedRoute = ({ children, allow }: Props) => {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (allow && !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
