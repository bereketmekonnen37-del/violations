import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Check,
  ChevronDown,
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
import type {
  DriverRecord,
  UnfilteredContinuousFile,
  UnfilteredFile,
  UnfilteredNightFile,
} from '../types';

// Reject transporter values that look like a plate/VID rather than a real
// carrier name. Plates in this dataset take shapes like "3-49646", "3-A31174",
// "3A-42318", "-03-A31196", or bare 3+ digit VIDs. A real transporter (e.g.
// "Biniyam") has alphabetic characters and no dash/digit-cluster pattern.
const looksLikePlateOrVid = (raw: string): boolean => {
  const s = raw.trim();
  if (!s) return true;
  if (/^-?\d+[-\s]?[A-Za-z]?\d*/.test(s) && /\d/.test(s) && /-/.test(s)) return true;
  if (/^\d{3,}$/.test(s)) return true;
  if (/^[0-9A-Z]{1,3}-[0-9A-Z]+$/i.test(s)) return true;
  return false;
};

// Aggregate the transporter labels from every Speed, Nights and Continuous
// upload — plus the driver-record list — so the dropdown shows the union of
// every carrier we have data for, not just VIDs that passed a threshold. The
// parsers now put the `Group:` value (or Global `Owner`) into the transporter
// field for all three sources, so this pulls together every carrier the boss
// ever uploaded a file for.
const collectKnownTransporters = (
  driverRecords: DriverRecord[],
  speedFiles: UnfilteredFile[],
  nightFiles: UnfilteredNightFile[],
  continuousFiles: UnfilteredContinuousFile[],
): string[] => {
  const seen = new Map<string, string>();
  const push = (v: string | undefined) => {
    const t = (v ?? '').trim();
    if (!t || looksLikePlateOrVid(t)) return;
    const key = t.toLowerCase();
    if (!seen.has(key)) seen.set(key, t);
  };
  driverRecords.forEach((r) => push(r.transporter));
  speedFiles.forEach((f) => f.drivers.forEach((d) => push(d.transporter)));
  nightFiles.forEach((f) => f.drivers.forEach((d) => push(d.transporter)));
  continuousFiles.forEach((f) => f.drivers.forEach((d) => push(d.transporter)));
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
};

interface FormState {
  name: string;
  email: string;
  password: string;
  selected: string[];
}

const emptyForm: FormState = {
  name: '',
  email: '',
  password: '',
  selected: [],
};

export const UserManagementPage = () => {
  const dispatch = useAppDispatch();
  const staffUsers = useAppSelector((s) => s.staffUsers.users);
  const unfilteredFiles = useAppSelector((s) => s.unfiltered.files);
  const nightFiles = useAppSelector((s) => s.unfilteredNights.files);
  const continuousFiles = useAppSelector((s) => s.unfilteredContinuous.files);
  const driverRecords = useAppSelector((s) => s.drivers.records);

  const transporterOptions = useMemo(
    () =>
      collectKnownTransporters(
        driverRecords,
        unfilteredFiles,
        nightFiles,
        continuousFiles,
      ),
    [driverRecords, unfilteredFiles, nightFiles, continuousFiles],
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
              Pick from transporters detected in your Speed, Nights and Continuous
              uploads. The staff account will only see data for these transporters
              on the Master Fleet page.
            </p>
            <div className="mt-2">
              <TransporterMultiSelect
                options={transporterOptions}
                value={form.selected}
                onChange={(next) => setForm((f) => ({ ...f, selected: next }))}
              />
            </div>
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
                    knownTransporters={transporterOptions}
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

/* ─────────────────────────────────────────────────────────
   Searchable multi-select dropdown for transporters
   ───────────────────────────────────────────────────────── */

interface TransporterMultiSelectProps {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}

const TransporterMultiSelect = ({
  options,
  value,
  onChange,
}: TransporterMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selectedSet = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (t: string) => {
    if (selectedSet.has(t.toLowerCase())) {
      onChange(value.filter((x) => x.toLowerCase() !== t.toLowerCase()));
    } else {
      onChange([...value, t]);
    }
  };

  const clearAll = () => onChange([]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-base flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <Truck size={14} className="shrink-0 text-ink-400" />
          {value.length === 0 ? (
            <span className="text-ink-400">Select transporters…</span>
          ) : (
            <span className="truncate text-ink-900 dark:text-white">
              {value.length} selected
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-ink-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
            >
              <Truck size={11} />
              {t}
              <button
                type="button"
                onClick={() => toggle(t)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-red-100 dark:hover:bg-red-900"
                aria-label={`Remove ${t}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div
          className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-elev dark:border-ink-700 dark:bg-ink-900"
        >
          <div className="border-b border-ink-100 p-2 dark:border-ink-800">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search transporters"
                className="input-base !py-2 !pl-9 text-sm"
              />
            </div>
          </div>

          <ul className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs italic text-ink-400">
                {options.length === 0
                  ? 'No transporters detected yet. Upload Speed, Nights or Continuous data first.'
                  : 'No matches for your search.'}
              </li>
            ) : (
              filtered.map((t) => {
                const checked = selectedSet.has(t.toLowerCase());
                return (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => toggle(t)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-ink-50 dark:hover:bg-ink-800"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                          checked
                            ? 'border-red-600 bg-red-600 text-white'
                            : 'border-ink-300 bg-white dark:border-ink-600 dark:bg-ink-900'
                        }`}
                        aria-hidden
                      >
                        {checked && <Check size={12} strokeWidth={3} />}
                      </span>
                      <Truck size={13} className="shrink-0 text-ink-400" />
                      <span className="truncate text-ink-900 dark:text-white">
                        {t}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {value.length > 0 && (
            <div className="flex items-center justify-between border-t border-ink-100 px-3 py-2 dark:border-ink-800">
              <span className="text-[11px] text-ink-500 dark:text-ink-400">
                {value.length} selected
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
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
            <div className="mt-2">
              <TransporterMultiSelect
                options={knownTransporters}
                value={draftTransporters}
                onChange={setDraftTransporters}
              />
            </div>
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
