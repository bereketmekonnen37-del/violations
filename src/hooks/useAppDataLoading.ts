import { useAppSelector } from '../app/store';

/**
 * True while the shared datasets that drive Dashboard / Master Fleet are
 * still being fetched for the first time this session.
 *
 * Unfiltered (speed/nights/continuous) slices are NOT redux-persisted, so
 * on every fresh page load they start at `idle`, flip to `loading` once
 * `useUnfilteredBootstrap` runs, and settle to `loaded`. We treat both
 * `idle` and `loading` as "still coming" so there's no visual flash of an
 * empty page before the fetch has even started.
 *
 * Drivers IS persisted, so if a cached roster is already in memory we
 * don't block on it — the background refresh can update the data in
 * place without a skeleton flash.
 */
export const useAppDataLoading = () => {
  const initializing = useAppSelector((s) => s.auth.initializing);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const speed = useAppSelector((s) => s.unfiltered);
  const nights = useAppSelector((s) => s.unfilteredNights);
  const continuous = useAppSelector((s) => s.unfilteredContinuous);
  const drivers = useAppSelector((s) => s.drivers);

  if (initializing) return true;
  if (!isAuthenticated) return false;

  const pending = (status: string, hasData: boolean) =>
    !hasData && (status === 'idle' || status === 'loading');

  return (
    pending(speed.status, speed.files.length > 0) ||
    pending(nights.status, nights.files.length > 0) ||
    pending(continuous.status, continuous.files.length > 0) ||
    pending(drivers.status, drivers.records.length > 0)
  );
};
