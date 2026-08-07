import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppSelector } from '../app/store';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { DriversDataPage } from '../pages/DriversDataPage';
import { FileDetailsPage } from '../pages/FileDetailsPage';
import { LoginPage } from '../pages/LoginPage';
import { MasterFleetPage } from '../pages/MasterFleetPage';
import { RulesPage } from '../pages/RulesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { UnfilteredContinuousPage } from '../pages/UnfilteredContinuousPage';
import { UnfilteredNightsPage } from '../pages/UnfilteredNightsPage';
import { UnfilteredPage } from '../pages/UnfilteredPage';
import { UploadPage } from '../pages/UploadPage';
import { ViolationFilesPage } from '../pages/ViolationFilesPage';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes = () => {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute allow={['staff']}>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/violations"
          element={
            <ProtectedRoute allow={['boss']}>
              <ViolationFilesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/violations/:fileId"
          element={
            <ProtectedRoute allow={['boss']}>
              <FileDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drivers-data"
          element={
            <ProtectedRoute allow={['boss']}>
              <DriversDataPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-fleet"
          element={
            <ProtectedRoute allow={['boss']}>
              <MasterFleetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rules"
          element={
            <ProtectedRoute allow={['boss']}>
              <RulesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/unfiltered" element={<UnfilteredPage />} />
        <Route path="/unfiltered-nights" element={<UnfilteredNightsPage />} />
        <Route
          path="/unfiltered-continuous"
          element={<UnfilteredContinuousPage />}
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
};
