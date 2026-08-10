import { useMemo, useState, type FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { newId } from '../lib/utils';
import {
  addStaffUser,
  removeStaffUser,
  updateStaffUser,
} from '../features/staffUsers/staffUsersSlice';

const collectKnownTransporters = (
  driverRecords: { transporter?: string }[],
  uploadFiles: { records: { transporter?: string }[] }[],
  unfilteredFiles: { drivers: { transporter?: string }[] }[],
  nightFiles: { drivers: { transporter?: string }[] }[],
  continuousFiles: { drivers: { transporter?: string }[] }[],
): string[] => {
  const seen = new Map<string, string>();
  const push = (value: string | undefined) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  };
  driverRecords.forEach((r) => push(r.transporter));
  uploadFiles.forEach((f) => f.records.forEach((r) => push(r.transporter)));
  unfilteredFiles.forEach((f) => f.drivers.forEach((d) => push(d.transporter)));
  nightFiles.forEach((f) => f.drivers.forEach((d) => push(d.transporter)));
  continuousFiles.forEach((f) => f.drivers.forEach((d) => push(d.transporter)));
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
};

interface FormState {
  name: string;
  email: string;
  password: string;
  transportersInput: string;
  selected: string[];
}

const emptyForm: FormState = {
  name: '',
  email: '',
  password: '',
  transportersInput: '',
  selected: [],
};

export const UserManagementPage = () => {
  const dispatch = useAppDispatch();
  const staffUsers = useAppSelector((s) => s.staffUsers.users);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const uploadFiles = useAppSelector((s) => s.uploads.files);
  const unfilteredFiles = useAppSelector((s) => s.unfiltered.files);
  const nightFiles = useAppSelector((s) => s.unfilteredNights.files);
  const continuousFiles = useAppSelector((s) => s.unfilteredContinuous.files);

  const knownTransporters = useMemo(
    () =>
      collectKnownTransporters(
        driverRecords,
        uploadFiles,
        unfilteredFiles,
        nightFiles,
        continuousFiles,
      ),
    [driverRecords, uploadFiles, unfilteredFiles, nightFiles, continuousFiles],
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staffUsers;
    return staffUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.assignedTransporters.some((t) => t.toLowerCase().includes(q)),
    );
  }, [staffUsers, query]);

  const toggleTransporter = (name: string) => {
    setForm((f) => {
      const exists = f.selected.some(
        (x) => x.toLowerCase() === name.toLowerCase(),
      );
      return {
        ...f,
        selected: exists
          ? f.selected.filter((x) => x.toLowerCase() !== name.toLowerCase())
          : [...f.selected, name],
      };
    });
  };

  const addTypedTransporter = () => {
    const t = form.transportersInput.trim();
    if (!t) return;
    setForm((f) => {
      const exists = f.selected.some((x) => x.toLowerCase() === t.toLowerCase());
      return {
        ...f,
        transportersInput: '',
        selected: exists ? f.selected : [...f.selected, t],
      };
    });
  };

  const removeSelected = (name: string) => {
    setForm((f) => ({
      ...f,
      selected: f.selected.filter((x) => x.toLowerCase() !== name.toLowerCase()),
    }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password;
    if (!name || !email || !password) {
      setError('Name, email and password are required.');
      return;
    }
    if (form.selected.length === 0) {
      setError('Assign at least one transporter.');
      return;
    }
    const conflict = staffUsers.some(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (conflict) {
      setError('A staff user with that email already exists.');
      return;
    }
    dispatch(
      addStaffUser({
        id: newId(),
        name,
        email,
        password,
        assignedTransporters: form.selected,
        createdAt: new Date().toISOString(),
      }),
    );
    setForm(emptyForm);
    setShowPw(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Boss workspace"
        title="User management"
        subtitle="Create staff accounts and scope them to specific transporters. Staff see the same views as the boss, filtered to only the transporters you assign — and cannot manage rules."
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* ── Create form ─────────────────────────────────── */}
        <form
          onSubmit={onSubmit}
          className="surface rounded-2xl p-5 sm:p-7 space-y-4"
        >
          <div>
            <h3 className="text-base font-semibold text-ink-900 dark:text-white">
              Create a new staff user
            </h3>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              They will sign in with the email and password below.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-700 dark:text-ink-300">
              Full name
            </label>
            <div className="relative mt-1.5">
              <UserIcon
                size={16}
                className="pointer-events-none absolute left-3.5 top-3 text-ink-400"
              />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Maya Johnson"
                className="input-base pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-700 dark:text-ink-300">
              Email
            </label>
            <div className="relative mt-1.5">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3.5 top-3 text-ink-400"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="staff@company.com"
                className="input-base pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-700 dark:text-ink-300">
              Password
            </label>
            <div className="relative mt-1.5">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3.5 top-3 text-ink-400"
              />
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="At least 6 characters"
                className="input-base pl-10 pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-2.5 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
                aria-label="Toggle password visibility"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-700 dark:text-ink-300">
              Assigned transporters
            </label>
            <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">
              Pick from known transporters (detected from your uploaded data) or
              type a name and press add.
            </p>

            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={form.transportersInput}
                onChange={(e) =>
                  setForm((f) => ({ ...f, transportersInput: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTypedTransporter();
                  }
                }}
                placeholder="Type a transporter name"
                className="input-base flex-1"
              />
              <button
                type="button"
                onClick={addTypedTransporter}
                className="btn-ghost"
                disabled={!form.transportersInput.trim()}
              >
                <Plus size={15} /> Add
              </button>
            </div>

            {form.selected.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {form.selected.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
                  >
                    <Truck size={11} />
                    {t}
                    <button
                      type="button"
                      onClick={() => removeSelected(t)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-red-100 dark:hover:bg-red-900"
                      aria-label={`Remove ${t}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {knownTransporters.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                  Detected transporters
                </p>
                <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-auto rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-2 dark:border-ink-700 dark:bg-ink-900/60">
                  {knownTransporters.map((t) => {
                    const selected = form.selected.some(
                      (x) => x.toLowerCase() === t.toLowerCase(),
                    );
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTransporter(t)}
                        className={
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ' +
                          (selected
                            ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                            : 'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-ink-800')
                        }
                      >
                        <Truck size={11} />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full">
            <Plus size={16} /> Create staff user
          </button>
        </form>

        {/* ── User list ───────────────────────────────────── */}
        <div className="surface rounded-2xl p-5 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-ink-900 dark:text-white">
                Staff users ({staffUsers.length})
              </h3>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                Every staff user below sees the boss dashboards filtered to their
                own transporters.
              </p>
            </div>
            <div className="relative sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, transporter"
                className="input-base !pl-9"
              />
            </div>
          </div>

          <div className="mt-4">
            {filteredUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={query ? 'No matching users' : 'No staff users yet'}
                description={
                  query
                    ? 'Try a different search term.'
                    : 'Create your first staff user with the form on the left.'
                }
              />
            ) : (
              <ul className="space-y-2">
                {filteredUsers.map((u) => (
                  <StaffUserRow
                    key={u.id}
                    id={u.id}
                    name={u.name}
                    email={u.email}
                    password={u.password}
                    transporters={u.assignedTransporters}
                    knownTransporters={knownTransporters}
                    onDelete={() => {
                      if (confirm(`Delete staff user ${u.email}?`)) {
                        dispatch(removeStaffUser(u.id));
                      }
                    }}
                    onSave={(patch) => dispatch(updateStaffUser({ id: u.id, ...patch }))}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface RowProps {
  id: string;
  name: string;
  email: string;
  password: string;
  transporters: string[];
  knownTransporters: string[];
  onDelete: () => void;
  onSave: (patch: {
    name?: string;
    email?: string;
    password?: string;
    assignedTransporters?: string[];
  }) => void;
}

const StaffUserRow = ({
  name,
  email,
  password,
  transporters,
  knownTransporters,
  onDelete,
  onSave,
}: RowProps) => {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(email);
  const [draftPw, setDraftPw] = useState('');
  const [draftTransporters, setDraftTransporters] = useState<string[]>(transporters);
  const [showPw, setShowPw] = useState(false);
  const [typed, setTyped] = useState('');

  const toggle = (t: string) =>
    setDraftTransporters((cur) =>
      cur.some((x) => x.toLowerCase() === t.toLowerCase())
        ? cur.filter((x) => x.toLowerCase() !== t.toLowerCase())
        : [...cur, t],
    );

  const addTyped = () => {
    const t = typed.trim();
    if (!t) return;
    setDraftTransporters((cur) =>
      cur.some((x) => x.toLowerCase() === t.toLowerCase()) ? cur : [...cur, t],
    );
    setTyped('');
  };

  const save = () => {
    onSave({
      name: draftName,
      email: draftEmail,
      password: draftPw,
      assignedTransporters: draftTransporters,
    });
    setDraftPw('');
    setShowPw(false);
    setEditing(false);
  };

  const cancel = () => {
    setDraftName(name);
    setDraftEmail(email);
    setDraftPw('');
    setDraftTransporters(transporters);
    setShowPw(false);
    setTyped('');
    setEditing(false);
  };

  return (
    <li className="rounded-xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Full name"
              className="input-base"
            />
            <input
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              placeholder="Email"
              className="input-base"
            />
          </div>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={draftPw}
              onChange={(e) => setDraftPw(e.target.value)}
              placeholder="New password (leave blank to keep current)"
              className="input-base pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-2.5 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
              aria-label="Toggle password visibility"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
              Assigned transporters
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTyped();
                  }
                }}
                placeholder="Type to add"
                className="input-base flex-1"
              />
              <button
                type="button"
                onClick={addTyped}
                className="btn-ghost"
                disabled={!typed.trim()}
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {draftTransporters.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {draftTransporters.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
                  >
                    <Truck size={10} />
                    {t}
                    <button
                      type="button"
                      onClick={() => toggle(t)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-red-100 dark:hover:bg-red-900"
                      aria-label={`Remove ${t}`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {knownTransporters.length > 0 && (
              <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-auto rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-2 dark:border-ink-700 dark:bg-ink-900/60">
                {knownTransporters.map((t) => {
                  const selected = draftTransporters.some(
                    (x) => x.toLowerCase() === t.toLowerCase(),
                  );
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggle(t)}
                      className={
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ' +
                        (selected
                          ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                          : 'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-ink-800')
                      }
                    >
                      <Truck size={10} />
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel} className="btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={save} className="btn-primary">
              Save changes
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">
                {name}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                <ShieldCheck size={10} /> Staff
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">
              {email} · password{' '}
              <span className="font-mono">
                {'•'.repeat(Math.min(10, password.length))}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {transporters.length === 0 ? (
                <span className="text-[11px] italic text-ink-400">
                  No transporters assigned
                </span>
              ) : (
                transporters.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
                  >
                    <Truck size={10} />
                    {t}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn-ghost !px-3 !py-1.5 text-xs"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="btn-ghost !px-3 !py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              aria-label="Delete user"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </li>
  );
};
