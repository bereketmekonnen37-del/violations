import { useMemo, useState } from 'react';
import { Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/store';
import {
  addDriverRecord,
  removeDriverRecord,
  updateDriverRecord,
} from './driversSlice';
import { newId } from '../../lib/utils';

export const DriversDataTable = () => {
  const dispatch = useAppDispatch();
  const records = useAppSelector((s) => s.drivers.records);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftVid, setDraftVid] = useState('');
  const [draftName, setDraftName] = useState('');
  const [query, setQuery] = useState('');
  const [newVid, setNewVid] = useState('');
  const [newName, setNewName] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.vid.toLowerCase().includes(q) ||
        r.driverName.toLowerCase().includes(q),
    );
  }, [records, query]);

  const startEdit = (id: string, vid: string, driverName: string) => {
    setEditingId(id);
    setDraftVid(vid);
    setDraftName(driverName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftVid('');
    setDraftName('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const vid = draftVid.trim();
    const driverName = draftName.trim();
    if (!vid || !driverName) return;
    dispatch(updateDriverRecord({ id: editingId, vid, driverName }));
    cancelEdit();
  };

  const handleAdd = () => {
    const vid = newVid.trim();
    const driverName = newName.trim();
    if (!vid || !driverName) return;
    dispatch(addDriverRecord({ id: newId(), vid, driverName }));
    setNewVid('');
    setNewName('');
  };

  return (
    <div className="surface rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-white">
            Drivers ({records.length})
          </h3>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            Edit, add or remove rows. Each VID maps to one driver name.
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search VID or driver name"
            className="input-base !pl-9"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-3 dark:border-ink-700 dark:bg-ink-900/60 sm:flex-row sm:items-center">
        <input
          type="text"
          value={newVid}
          onChange={(e) => setNewVid(e.target.value)}
          placeholder="VID (e.g. 1538)"
          className="input-base sm:max-w-[180px]"
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Driver name"
          className="input-base flex-1"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newVid.trim() || !newName.trim()}
          className="btn-primary !px-4"
        >
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-ink-100 dark:border-ink-800">
        <table className="min-w-full text-sm">
          <thead className="bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:bg-ink-900 dark:text-ink-400">
            <tr>
              <th className="px-4 py-3">VID</th>
              <th className="px-4 py-3">Driver name</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
                >
                  {records.length === 0
                    ? 'No drivers yet — upload a monthly list above or add a row.'
                    : 'No drivers match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const editing = editingId === r.id;
                return (
                  <tr key={r.id} className="bg-white dark:bg-ink-900">
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      {editing ? (
                        <input
                          value={draftVid}
                          onChange={(e) => setDraftVid(e.target.value)}
                          className="input-base !py-1.5"
                        />
                      ) : (
                        r.vid
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {editing ? (
                        <input
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          className="input-base !py-1.5"
                        />
                      ) : (
                        r.driverName
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="btn-primary !px-3 !py-1.5 text-xs"
                            >
                              <Save size={13} /> Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="btn-ghost !px-3 !py-1.5 text-xs"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(r.id, r.vid, r.driverName)}
                              className="btn-ghost !px-3 !py-1.5 text-xs"
                              aria-label="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => dispatch(removeDriverRecord(r.id))}
                              className="btn-ghost !px-3 !py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              aria-label="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
