import { CalendarRange, FileSpreadsheet, Trash2, Users } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DriversDataUpload } from '../features/drivers/DriversDataUpload';
import { DriversDataTable } from '../features/drivers/DriversDataTable';
import { clearDrivers } from '../features/drivers/driversSlice';
import { formatDateTime } from '../lib/utils';

export const DriversDataPage = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const drivers = useAppSelector((s) => s.drivers);

  if (!user) return null;

  const hasData = drivers.records.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Manager workspace"
        title="Drivers data"
        subtitle="Upload the monthly drivers list once. The mapping (VID → driver name) is used to enrich every Speed, Nights and Continuous CSV export."
        actions={
          hasData ? (
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear the monthly drivers list?')) {
                  dispatch(clearDrivers());
                }
              }}
              className="btn-ghost text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 size={15} /> Clear list
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Drivers on file"
          value={drivers.records.length}
          icon={Users}
        />
        <StatCard
          label="Current period"
          value={drivers.period || '—'}
          icon={CalendarRange}
        />
        <StatCard
          label="Last upload"
          value={drivers.uploadedAt ? formatDateTime(drivers.uploadedAt) : '—'}
          icon={FileSpreadsheet}
          delta={drivers.uploaderName ? `By ${drivers.uploaderName}` : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <DriversDataUpload user={user} />
        <DriversDataTable />
      </div>
    </div>
  );
};
