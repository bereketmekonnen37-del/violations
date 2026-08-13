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
  const [draftTransporter, setDraftTransporter] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftVid, setDraftVid] = useState('');
  const [query, setQuery] = useState('');
  const [newTransporter, setNewTransporter] = useState('');
  const [newName, setNewName] = useState('');
  const [newVid, setNewVid] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.vid.toLowerCase().includes(q) ||
        r.driverName.toLowerCase().includes(q) ||
        (r.transporter ?? '').toLowerCase().includes(q),
    );
  }, [records, query]);

  const startEdit = (
    id: string,
    transporter: string,
    driverName: string,
    vid: string,
  ) => {
    setEditingId(id);
    setDraftTransporter(transporter);
    setDraftName(driverName);
    setDraftVid(vid);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTransporter('');
    setDraftName('');
    setDraftVid('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const vid = draftVid.trim();
    const driverName = draftName.trim();
    const transporter = draftTransporter.trim();
    if (!vid) return;
    dispatch(updateDriverRecord({ id: editingId, vid, driverName, transporter }));
    cancelEdit();
  };

  const handleAdd = () => {
    const vid = newVid.trim();
    const driverName = newName.trim();
    const transporter = newTransporter.trim();
    if (!vid || (!driverName && !transporter)) return;
    dispatch(
      addDriverRecord({ id: newId(), vid, driverName, transporter }),
    );
    setNewTransporter('');
    setNewName('');
    setNewVid('');
  };

  return (
    <div className="surface rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-white">
            Drivers ({records.length})
          </h3>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            Each VID maps to one transporter and one driver. Used to enrich every
            master and clean CSV export.
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
            placeholder="Search VID, driver or transporter"
            className="input-base !pl-9"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-2 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-3 dark:border-ink-700 dark:bg-ink-900/60 sm:grid-cols-[1fr_1fr_180px_auto]">
        <input
          type="text"
          value={newTransporter}
          onChange={(e) => setNewTransporter(e.target.value)}
          placeholder="Transporter"
          className="input-base"
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Drivers Name"
          className="input-base"
        />
        <input
          type="text"
          value={newVid}
          onChange={(e) => setNewVid(e.target.value)}
          placeholder="VID (e.g. 2510)"
          className="input-base"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newVid.trim() || (!newName.trim() && !newTransporter.trim())}
          className="btn-primary !px-4"
        >
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-ink-100 dark:border-ink-800">
        <table className="min-w-full text-sm">
          <thead className="bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:bg-ink-900 dark:text-ink-400">
            <tr>
              <th className="px-4 py-3">Transporter</th>
              <th className="px-4 py-3">Drivers Name</th>
              <th className="px-4 py-3">VID</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
                >
                  {records.length === 0
                    ? 'No drivers yet — upload the boss list above or add a row.'
                    : 'No drivers match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const editing = editingId === r.id;
                return (
                  <tr key={r.id} className="bg-white dark:bg-ink-900">
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {editing ? (
                        <input
                          value={draftTransporter}
                          onChange={(e) => setDraftTransporter(e.target.value)}
                          className="input-base !py-1.5"
                        />
                      ) : (
                        r.transporter || (
                          <span className="text-ink-400">—</span>
                        )
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
                        r.driverName || (
                          <span className="text-ink-400">—</span>
                        )
                      )}
                    </td>
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
                              onClick={() =>
                                startEdit(
                                  r.id,
                                  r.transporter ?? '',
                                  r.driverName,
                                  r.vid,
                                )
                              }
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
