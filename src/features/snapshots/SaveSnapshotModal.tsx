import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  FolderArchive,
  Loader2,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { useAppSelector } from '../../app/store';
import { Modal } from '../../components/ui/Modal';
import { listActiveRules, type RuleSet } from '../../lib/snapshotRules';
import { buildSnapshotData } from '../../lib/snapshots';
import type {
  DriverRecord,
  UnfilteredContinuousFile,
  UnfilteredFile,
  UnfilteredNightFile,
} from '../../types';
import { createSnapshot } from './snapshotsApi';

interface Props {
  open: boolean;
  onClose: () => void;
  speedFiles: UnfilteredFile[];
  nightFiles: UnfilteredNightFile[];
  continuousFiles: UnfilteredContinuousFile[];
  driverRecords: DriverRecord[];
  /** The rules Master Fleet is using right now. */
  rules: RuleSet;
}

const defaultName = (): string =>
  `Snapshot ${new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })}`;

export const SaveSnapshotModal = ({
  open,
  onClose,
  speedFiles,
  nightFiles,
  continuousFiles,
  driverRecords,
  rules,
}: Props) => {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [name, setName] = useState(defaultName);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => listActiveRules(rules), [rules]);
  const groups = useMemo(() => {
    const order = ['Duration', 'Whitelist', 'Other'] as const;
    return order
      .map((g) => ({ group: g, items: items.filter((i) => i.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [items]);

  const toggle = (id: string) =>
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && !saving && user != null;

  const save = async () => {
    if (!canSave || !user) return;
    setSaving(true);
    setError(null);
    try {
      // Let the spinner paint before the (synchronous) recompute.
      await new Promise((r) => setTimeout(r, 30));
      const data = buildSnapshotData({
        speedFiles,
        nightFiles,
        continuousFiles,
        driverRecords,
        rules,
        removedRuleIds: removed,
      });
      const meta = await createSnapshot({
        name: trimmed,
        data,
        userId: user.id,
        userName: user.name,
      });
      onClose();
      navigate(`/snapshots/${meta.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the snapshot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Save this data as a snapshot"
      subtitle="Name the folder, then choose which of the current rules apply to this snapshot."
      widthClassName="w-[94vw] max-w-[760px]"
    >
      <div className="flex flex-col gap-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Folder name
          </span>
          <div className="relative mt-1.5">
            <FolderArchive
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Week 38 review"
              maxLength={120}
              autoFocus
              className="input-base !pl-9"
            />
          </div>
        </label>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                Active rules
              </h3>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                Switch a rule off to leave it out of this snapshot. Your live
                Rules page is not changed.
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-ink-500 dark:text-ink-400">
              {items.length - removed.size} of {items.length} applied
            </span>
          </div>

          <div className="mt-3 max-h-[42vh] space-y-4 overflow-y-auto pr-1">
            {groups.map(({ group, items: groupItems }) => (
              <div key={group}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  {group}
                </p>
                <ul className="space-y-2">
                  {groupItems.map((item) => {
                    const on = !removed.has(item.id);
                    return (
                      <li
                        key={item.id}
                        className={
                          'rounded-xl border p-3 transition ' +
                          (on
                            ? 'border-brand-blue-line bg-white dark:bg-ink-900'
                            : 'border-dashed border-ink-200 bg-ink-50 opacity-70 dark:border-ink-700 dark:bg-ink-950')
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
                              {on ? (
                                <ShieldCheck size={14} className="text-emerald-600" />
                              ) : (
                                <ShieldOff size={14} className="text-ink-400" />
                              )}
                              <span className={on ? '' : 'line-through'}>{item.label}</span>
                            </p>
                            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                              {item.detail}
                            </p>
                            {item.chips.length > 0 && (
                              <div className="mt-2 flex max-h-20 flex-wrap gap-1 overflow-y-auto">
                                {item.chips.map((c, i) => (
                                  <span
                                    key={`${c}-${i}`}
                                    className="rounded-full bg-ink-100 px-2 py-0.5 font-mono text-[10px] text-ink-700 dark:bg-ink-800 dark:text-ink-200"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            aria-label={`${on ? 'Remove' : 'Apply'} ${item.label}`}
                            onClick={() => toggle(item.id)}
                            className={
                              'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ' +
                              (on ? 'bg-brand-blue' : 'bg-ink-300 dark:bg-ink-700')
                            }
                          >
                            <span
                              className={
                                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition ' +
                                (on ? 'translate-x-5' : 'translate-x-0.5')
                              }
                            />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800 sm:flex-row sm:items-center">
          <button type="button" onClick={onClose} disabled={saving} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!canSave} className="btn-primary">
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FolderArchive size={15} />
            )}
            {saving ? 'Saving…' : 'Save snapshot'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
