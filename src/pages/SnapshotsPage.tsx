import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  FolderArchive,
  FolderOpen,
  Loader2,
  RefreshCw,
  Trash2,
  Trophy,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  deleteSnapshot,
  listSnapshots,
} from '../features/snapshots/snapshotsApi';
import type { SnapshotMeta } from '../lib/snapshots';
import { formatDateTime } from '../lib/utils';

export const SnapshotsPage = () => {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SnapshotMeta | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshots(await listSnapshots());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load snapshots.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteSnapshot(pendingDelete.id);
      setSnapshots((prev) => prev?.filter((s) => s.id !== pendingDelete.id) ?? prev);
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the snapshot.');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow="Manager workspace"
        title="Snapshots"
        subtitle="Saved copies of the Master Fleet data. Each folder keeps the exact ranking, tabs and rules from the moment you saved it."
        actions={
          <>
            <button type="button" onClick={load} disabled={loading} className="btn-secondary">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Refresh
            </button>
            <Link to="/master-fleet" className="btn-primary">
              <Trophy size={16} /> Go to Master fleet
            </Link>
          </>
        }
      />

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {snapshots == null && loading ? (
        <EmptyState icon={Loader2} title="Loading snapshots…" />
      ) : snapshots && snapshots.length === 0 ? (
        <EmptyState
          icon={FolderArchive}
          title="No snapshots yet"
          description='Open Master fleet and press "Save this data" to create your first snapshot folder.'
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(snapshots ?? []).map((s) => (
            <div
              key={s.id}
              className="group surface relative flex flex-col rounded-2xl p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-elev"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange-soft text-brand-orange-dark ring-1 ring-brand-orange-line">
                    <FolderArchive size={20} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-semibold tracking-tight text-ink-900 dark:text-white" title={s.name}>
                      {s.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">
                      {formatDateTime(s.createdAt)}
                      {s.createdByName ? ` · ${s.createdByName}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDelete(s)}
                  aria-label={`Delete ${s.name}`}
                  title="Delete this snapshot"
                  className="btn-ghost h-8 w-8 shrink-0 p-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ['Drivers', s.summary.drivers],
                    ['Speed', s.summary.speed],
                    ['Nights', s.summary.nights],
                    ['Cont.', s.summary.continuous],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="surface-2 rounded-xl p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      {label}
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-ink-900 dark:text-white">
                      {(value ?? 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[11px] text-ink-500 dark:text-ink-400">
                {(s.summary.total ?? 0).toLocaleString()} violations ·{' '}
                {s.summary.transporters ?? 0} transporters ·{' '}
                {(s.summary.filtered ?? 0).toLocaleString()} rule-filtered ·{' '}
                {s.summary.rulesApplied ?? 0} rules applied
                {s.summary.rulesRemoved ? `, ${s.summary.rulesRemoved} removed` : ''}
              </p>

              <Link to={`/snapshots/${s.id}`} className="btn-primary mt-4 justify-center">
                <FolderOpen size={15} /> Open folder
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={pendingDelete != null}
        onClose={() => !deleting && setPendingDelete(null)}
        title="Delete this snapshot?"
        subtitle={pendingDelete?.name}
        widthClassName="w-[92vw] max-w-[440px]"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            The folder and all of its saved data will be removed permanently. Your
            uploads and live Master Fleet are not affected.
          </p>
          <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800 sm:flex-row sm:items-center">
            <button type="button" onClick={() => setPendingDelete(null)} disabled={deleting} className="btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} disabled={deleting} className="btn-danger">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete snapshot
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
