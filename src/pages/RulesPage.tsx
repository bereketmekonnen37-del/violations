import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Infinity as InfinityIcon,
  MapPin,
  Minus,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Route as RouteIcon,
  Ruler,
  ScissorsLineDashed,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { Modal } from '../components/ui/Modal';
import {
  DEFAULT_RULE_THRESHOLDS,
  addAllowedLocation,
  addAllowedVid,
  clearAllowedLocations,
  clearAllowedVids,
  removeAllowedLocation,
  removeAllowedVid,
  resetThresholds,
  setAllowedLocationDates,
  setAllowedVidDates,
  setMaxDurationSeconds,
  setThresholds,
  setUnderestimatedRule,
  type AllowedLocationCategory,
  type AllowedLocationEntry,
  type AllowedVidCategory,
  type AllowedVidEntry,
  type RuleThresholds,
  type UnderestimatedRule,
} from '../features/rules/rulesSlice';
import { extractRuleTag } from '../lib/locationRules';
import { saveAppRules } from '../features/rules/rulesApi';

/* ── helpers ─────────────────────────────────────────────────────── */

type Category = AllowedVidCategory;

const CATEGORY_META: Record<
  Category,
  { label: string; icon: typeof Gauge; tone: string; ring: string }
> = {
  speed: {
    label: 'Speed',
    icon: Gauge,
    tone: 'text-amber-800 dark:text-amber-200',
    ring:
      'ring-amber-200 bg-amber-50 dark:ring-amber-500/40 dark:bg-amber-500/10',
  },
  nights: {
    label: 'Nights',
    icon: Moon,
    tone: 'text-indigo-800 dark:text-indigo-200',
    ring:
      'ring-indigo-200 bg-indigo-50 dark:ring-indigo-500/40 dark:bg-indigo-500/10',
  },
  continuous: {
    label: 'Continuous',
    icon: RouteIcon,
    tone: 'text-emerald-800 dark:text-emerald-200',
    ring:
      'ring-emerald-200 bg-emerald-50 dark:ring-emerald-500/40 dark:bg-emerald-500/10',
  },
};

const formatThreshold = (seconds: number): string => {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds}s`;
};

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_LABELS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const parseDateKey = (key: string): { y: number; m: number; d: number } => {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m: m - 1, d };
};

const formatDateKey = (key: string): string => {
  const { y, m, d } = parseDateKey(key);
  return `${MONTH_LABELS_SHORT[m]} ${d}, ${y}`;
};

const toDateKey = (y: number, m: number, d: number): string =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/* ── page ────────────────────────────────────────────────────────── */

export const RulesPage = () => {
  const dispatch = useAppDispatch();
  const thresholds = useAppSelector((s) => s.rules.thresholds);
  const maxDurationSeconds = useAppSelector((s) => s.rules.maxDurationSeconds);
  const underestimatedRule = useAppSelector(
    (s) => s.rules.underestimatedRule ?? null,
  );
  const allowedVidsByType = useAppSelector((s) => s.rules.allowedVidsByType);
  const allowedLocationsByType = useAppSelector(
    (s) => s.rules.allowedLocationsByType,
  );
  const hydrated = useAppSelector((s) => s.rules.hydrated);
  const userId = useAppSelector((s) => s.auth.user?.id);

  // Persist any local Rules change to Supabase so every boss/staff session
  // sees it. Debounced so a burst of edits (e.g. toggling several dates in
  // the calendar) doesn't fire one request per click, and gated on
  // `hydrated` so the very first render — before the bootstrap fetch has
  // replaced local defaults with the server copy — never overwrites it.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirst = useRef(true);
  useEffect(() => {
    if (!hydrated || !userId) return;
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveAppRules(
        {
          thresholds,
          allowedVidsByType,
          allowedLocationsByType,
          maxDurationSeconds,
          underestimatedRule,
        },
        userId,
      ).catch(() => {
        // Local state already reflects the change; a failed sync just
        // means the next edit (or reload) will retry it.
      });
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    thresholds,
    allowedVidsByType,
    allowedLocationsByType,
    maxDurationSeconds,
    underestimatedRule,
    hydrated,
    userId,
  ]);

  const [activeCategory, setActiveCategory] = useState<Category>('speed');

  const totalVids =
    allowedVidsByType.speed.length +
    allowedVidsByType.nights.length +
    allowedVidsByType.continuous.length;
  const totalLocations =
    allowedLocationsByType.speed.length +
    allowedLocationsByType.nights.length +
    allowedLocationsByType.continuous.length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Manager workspace"
        title="Rules"
        subtitle="Whitelist VIDs and locations per violation type. Each rule can apply on every day, or only on the specific dates you pin — perfect for one-off permissions like a scheduled trip or a border crossing on a given day."
      />

      <div className="space-y-8">
        <ThresholdsCard
          thresholds={thresholds}
          onChange={(t) => dispatch(setThresholds(t))}
          onReset={() => dispatch(resetThresholds())}
        />

        <MaxDurationCard
          maxDurationSeconds={maxDurationSeconds}
          onChange={(seconds) => dispatch(setMaxDurationSeconds(seconds))}
        />

        <UnderestimatedRuleCard
          rule={underestimatedRule}
          continuousThreshold={thresholds.continuous}
          onChange={(rule) => dispatch(setUnderestimatedRule(rule))}
        />

        <section className="surface rounded-2xl p-5 sm:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="inline-flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-white">
                <Sparkles size={16} /> Per-violation whitelists
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-ink-500 dark:text-ink-400">
                Pick a violation type below, then add the VIDs or locations
                that should be excluded from its counts. Add a date scope to
                make the rule fire only on that day — leave it empty for a
                permanent allow.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-ink-500 dark:text-ink-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-1 font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                <Truck size={11} /> {totalVids} VID{totalVids === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-1 font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                <MapPin size={11} /> {totalLocations} location
                {totalLocations === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <CategoryTabs
              active={activeCategory}
              onChange={setActiveCategory}
              counts={{
                speed:
                  allowedVidsByType.speed.length +
                  allowedLocationsByType.speed.length,
                nights:
                  allowedVidsByType.nights.length +
                  allowedLocationsByType.nights.length,
                continuous:
                  allowedVidsByType.continuous.length +
                  allowedLocationsByType.continuous.length,
              }}
            />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <AllowedVidPanel
              category={activeCategory}
              entries={allowedVidsByType[activeCategory]}
              onAdd={(value, dates) =>
                dispatch(
                  addAllowedVid({ category: activeCategory, value, dates }),
                )
              }
              onSetDates={(value, dates) =>
                dispatch(
                  setAllowedVidDates({
                    category: activeCategory,
                    value,
                    dates,
                  }),
                )
              }
              onRemove={(value) =>
                dispatch(removeAllowedVid({ category: activeCategory, value }))
              }
              onClear={() => dispatch(clearAllowedVids(activeCategory))}
            />
            <AllowedLocationPanel
              category={activeCategory}
              entries={allowedLocationsByType[activeCategory]}
              onAdd={(value, dates) =>
                dispatch(
                  addAllowedLocation({
                    category: activeCategory,
                    value,
                    dates,
                  }),
                )
              }
              onSetDates={(value, dates) =>
                dispatch(
                  setAllowedLocationDates({
                    category: activeCategory,
                    value,
                    dates,
                  }),
                )
              }
              onRemove={(value) =>
                dispatch(
                  removeAllowedLocation({
                    category: activeCategory,
                    value,
                  }),
                )
              }
              onClear={() => dispatch(clearAllowedLocations(activeCategory))}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

/* ── category tabs ───────────────────────────────────────────────── */

interface CategoryTabsProps {
  active: Category;
  onChange: (c: Category) => void;
  counts: Record<Category, number>;
}

const CategoryTabs = ({ active, onChange, counts }: CategoryTabsProps) => (
  <div
    role="tablist"
    className="grid grid-cols-3 gap-2 rounded-2xl border border-ink-100 bg-ink-50/60 p-1.5 dark:border-ink-800 dark:bg-ink-900/60"
  >
    {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
      const meta = CATEGORY_META[c];
      const Icon = meta.icon;
      const isActive = c === active;
      return (
        <button
          key={c}
          role="tab"
          aria-selected={isActive}
          type="button"
          onClick={() => onChange(c)}
          className={
            'group relative flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ' +
            (isActive
              ? 'bg-white text-brand-blue-dark shadow-card border border-brand-blue-line'
              : 'text-ink-500 hover:text-brand-blue')
          }
        >
          <span
            className={
              'inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 transition ' +
              (isActive ? meta.ring : 'ring-transparent bg-transparent')
            }
          >
            <Icon
              size={14}
              className={isActive ? meta.tone : 'text-ink-500 dark:text-ink-400'}
            />
          </span>
          <span>{meta.label}</span>
          <span
            className={
              'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' +
              (isActive
                ? 'bg-brand-blue text-white'
                : 'bg-brand-blue-soft text-brand-blue-dark')
            }
          >
            {counts[c]}
          </span>
        </button>
      );
    })}
  </div>
);

/* ── thresholds card ─────────────────────────────────────────────── */

interface ThresholdsCardProps {
  thresholds: RuleThresholds;
  onChange: (t: RuleThresholds) => void;
  onReset: () => void;
}

const splitHM = (seconds: number): { h: number; m: number } => ({
  h: Math.floor(seconds / 3600),
  m: Math.floor((seconds % 3600) / 60),
});

const ThresholdsCard = ({ thresholds, onChange, onReset }: ThresholdsCardProps) => {
  const isDefault =
    thresholds.speed === DEFAULT_RULE_THRESHOLDS.speed &&
    thresholds.nights === DEFAULT_RULE_THRESHOLDS.nights &&
    thresholds.continuous === DEFAULT_RULE_THRESHOLDS.continuous;

  const setKey = (key: keyof RuleThresholds, next: number) =>
    onChange({ ...thresholds, [key]: Math.max(0, next) });

  return (
    <section className="surface rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-white">
            <SlidersHorizontal size={16} /> Duration thresholds
          </h2>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            Only events longer than the minimum duration are counted on Master Fleet.
          </p>
        </div>
        {!isDefault && (
          <button type="button" onClick={onReset} className="btn-ghost !py-1 !px-2 text-xs">
            <RotateCcw size={12} /> Reset to defaults
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <DurationField
          icon={Gauge}
          label="Speed"
          seconds={thresholds.speed}
          onChange={(v) => setKey('speed', v)}
        />
        <DurationField
          icon={Moon}
          label="Nights"
          seconds={thresholds.nights}
          onChange={(v) => setKey('nights', v)}
        />
        <DurationField
          icon={RouteIcon}
          label="Continuous"
          seconds={thresholds.continuous}
          onChange={(v) => setKey('continuous', v)}
        />
      </div>
    </section>
  );
};

interface DurationFieldProps {
  icon: typeof Gauge;
  label: string;
  seconds: number;
  onChange: (seconds: number) => void;
}

const DurationField = ({ icon: Icon, label, seconds, onChange }: DurationFieldProps) => {
  const { h, m } = splitHM(seconds);
  const setHM = (nextH: number, nextM: number) => {
    const clampedH = Math.max(0, Math.min(72, nextH));
    const clampedM = Math.max(0, Math.min(59, nextM));
    onChange(clampedH * 3600 + clampedM * 60);
  };
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: '#ffffff', border: '1px solid var(--color-brand-navy-line)' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Icon size={12} /> {label} minimum
        </span>
        <span
          className="font-mono text-[11px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ≥ {formatThreshold(seconds)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberStepper label="Hours" value={h} min={0} max={72} onChange={(v) => setHM(v, m)} />
        <NumberStepper
          label="Minutes"
          value={m}
          min={0}
          max={59}
          onChange={(v) => setHM(h, v)}
        />
      </div>
    </div>
  );
};

interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const NumberStepper = ({ label, value, min, max, onChange }: NumberStepperProps) => {
  const [text, setText] = useState<string>(String(value));
  const [lastValue, setLastValue] = useState<number>(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(min);
      setText(String(min));
      return;
    }
    const n = Math.floor(Number(trimmed));
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    onChange(clamped);
    setText(String(clamped));
  };

  const bump = (delta: number) => {
    const clamped = Math.max(min, Math.min(max, value + delta));
    onChange(clamped);
  };

  return (
    <label className="block">
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <div
        className="mt-1 flex items-stretch overflow-hidden rounded-xl"
        style={{ border: '1px solid var(--color-brand-navy-line)' }}
      >
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex w-9 shrink-0 items-center justify-center text-sm transition disabled:opacity-40"
          style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="min-w-0 flex-1 border-0 bg-white px-2 py-2 text-center text-sm outline-none"
          style={{ color: 'var(--color-text-primary)' }}
        />
        <button
          type="button"
          onClick={() => bump(1)}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex w-9 shrink-0 items-center justify-center text-sm transition disabled:opacity-40"
          style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
        >
          <Plus size={14} />
        </button>
      </div>
    </label>
  );
};

/* ── max duration cap ────────────────────────────────────────────── */

interface MaxDurationCardProps {
  maxDurationSeconds: number | null;
  onChange: (seconds: number | null) => void;
}

const MaxDurationCard = ({ maxDurationSeconds, onChange }: MaxDurationCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const hasCap = maxDurationSeconds != null;

  return (
    <section className="surface rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-white">
            <ScissorsLineDashed size={16} /> Maximum duration cap
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-ink-500 dark:text-ink-400">
            Set an upper bound on event duration. Any Speed, Nights or
            Continuous row longer than this is dropped everywhere — Dashboard,
            Master Fleet and Transporter pages. Change or remove it anytime.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasCap && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="btn-ghost !py-1 !px-2 text-xs text-red-600 dark:text-red-400"
            >
              <Trash2 size={12} /> Remove cap
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            <ScissorsLineDashed size={14} /> Set duration
          </button>
        </div>
      </div>

      <div className="mt-4">
        {hasCap ? (
          <div
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
            style={{
              background: 'var(--color-brand-accent-soft)',
              border: '1px solid var(--color-brand-accent-line)',
              color: 'var(--color-brand-accent-dark)',
            }}
          >
            <AlertTriangle size={14} />
            Dropping any duration above{' '}
            <span className="font-mono">{formatThreshold(maxDurationSeconds!)}</span>
          </div>
        ) : (
          <p
            className="rounded-xl px-3 py-2.5 text-xs"
            style={{
              background: 'var(--color-brand-blue-soft)',
              border: '1px dashed var(--color-brand-blue-line)',
              color: 'var(--color-text-muted)',
            }}
          >
            No cap set — every duration is kept, no matter how long.
          </p>
        )}
      </div>

      {modalOpen && (
        <SetDurationModal
          initialSeconds={maxDurationSeconds}
          onSubmit={(seconds) => {
            onChange(seconds);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
};

interface SetDurationModalProps {
  initialSeconds: number | null;
  onSubmit: (seconds: number | null) => void;
  onClose: () => void;
}

const SetDurationModal = ({
  initialSeconds,
  onSubmit,
  onClose,
}: SetDurationModalProps) => {
  const initial = splitHM(initialSeconds ?? 3600);
  const [h, setH] = useState(initial.h);
  const [m, setM] = useState(initial.m);

  const seconds = h * 3600 + m * 60;
  const valid = seconds > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Set duration cap"
      subtitle="Any event longer than this duration will be dropped from every count and list."
      widthClassName="w-[92vw] max-w-[480px]"
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2">
          <NumberStepper label="Hours" value={h} min={0} max={999} onChange={setH} />
          <NumberStepper label="Minutes" value={m} min={0} max={59} onChange={setM} />
        </div>
        <p
          className="rounded-xl px-3 py-2.5 text-xs"
          style={{
            background: 'var(--color-brand-blue-soft)',
            border: '1px solid var(--color-brand-blue-line)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {valid
            ? `Any duration above ${formatThreshold(seconds)} will be dropped from Dashboard, Master Fleet and Transporter pages.`
            : 'Enter a duration greater than zero.'}
        </p>
        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800 sm:flex-row sm:items-center">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => valid && onSubmit(seconds)}
            disabled={!valid}
            className="btn-primary"
          >
            <ScissorsLineDashed size={14} /> Apply cap
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* ── continuous under-estimated rule ─────────────────────────────── */

interface UnderestimatedRuleCardProps {
  rule: UnderestimatedRule | null;
  continuousThreshold: number;
  onChange: (rule: UnderestimatedRule | null) => void;
}

const UnderestimatedRuleCard = ({
  rule,
  continuousThreshold,
  onChange,
}: UnderestimatedRuleCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="surface rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-white">
            <Ruler size={16} /> Under-estimated continuous rule
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-ink-500 dark:text-ink-400">
            A Continuous event whose duration is at least the hours you set{' '}
            <em>and</em> whose distance is at most the km you set is not a
            violation: it is not counted or ranked. It still shows on the Master
            Fleet Continuous list, tagged as an under-estimated violation with
            its VID, time and location.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rule && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="btn-ghost !py-1 !px-2 text-xs text-red-600 dark:text-red-400"
            >
              <Trash2 size={12} /> Remove rule
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            <Ruler size={14} /> {rule ? 'Edit rule' : 'Set rule'}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {rule ? (
          <div className="flex flex-col gap-2">
            <div
              className="inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
              style={{
                background: 'var(--color-brand-accent-soft)',
                border: '1px solid var(--color-brand-accent-line)',
                color: 'var(--color-brand-accent-dark)',
              }}
            >
              <AlertTriangle size={14} />
              Duration ≥{' '}
              <span className="font-mono">{formatThreshold(rule.minDurationSeconds)}</span>{' '}
              and distance ≤ <span className="font-mono">{rule.maxKm} km</span>
            </div>
          </div>
        ) : (
          <p
            className="rounded-xl px-3 py-2.5 text-xs"
            style={{
              background: 'var(--color-brand-blue-soft)',
              border: '1px dashed var(--color-brand-blue-line)',
              color: 'var(--color-text-muted)',
            }}
          >
            No rule set — every Continuous event over the minimum counts as a
            violation.
          </p>
        )}
      </div>

      {modalOpen && (
        <SetUnderestimatedModal
          initial={rule}
          continuousThreshold={continuousThreshold}
          onSubmit={(next) => {
            onChange(next);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
};

interface SetUnderestimatedModalProps {
  initial: UnderestimatedRule | null;
  continuousThreshold: number;
  onSubmit: (rule: UnderestimatedRule) => void;
  onClose: () => void;
}

const SetUnderestimatedModal = ({
  initial,
  continuousThreshold,
  onSubmit,
  onClose,
}: SetUnderestimatedModalProps) => {
  const start = splitHM(initial?.minDurationSeconds ?? continuousThreshold);
  const [h, setH] = useState(start.h);
  const [m, setM] = useState(start.m);
  const [km, setKm] = useState(initial?.maxKm ?? 100);

  const seconds = h * 3600 + m * 60;
  const valid = seconds > 0 && km > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Under-estimated continuous rule"
      subtitle="Duration at least the time below AND distance at most the km below."
      widthClassName="w-[92vw] max-w-[480px]"
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-2">
          <NumberStepper label="Hours ≥" value={h} min={0} max={72} onChange={setH} />
          <NumberStepper label="Minutes" value={m} min={0} max={59} onChange={setM} />
          <NumberStepper label="Distance ≤ km" value={km} min={0} max={100000} onChange={setKm} />
        </div>
        <p
          className="rounded-xl px-3 py-2.5 text-xs"
          style={{
            background: 'var(--color-brand-blue-soft)',
            border: '1px solid var(--color-brand-blue-line)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {valid
            ? `Continuous events of ${formatThreshold(seconds)} or more that cover ${km} km or less will not count as violations. They are listed on Master Fleet as under-estimated.`
            : 'Enter a duration and a distance greater than zero.'}
        </p>
        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800 sm:flex-row sm:items-center">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => valid && onSubmit({ minDurationSeconds: seconds, maxKm: km })}
            disabled={!valid}
            className="btn-primary"
          >
            <Ruler size={14} /> Apply rule
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* ── VID + Location panels ───────────────────────────────────────── */

interface VidPanelProps {
  category: Category;
  entries: AllowedVidEntry[];
  onAdd: (value: string, dates: string[]) => void;
  onSetDates: (value: string, dates: string[]) => void;
  onRemove: (value: string) => void;
  onClear: () => void;
}

const AllowedVidPanel = ({
  category,
  entries,
  onAdd,
  onSetDates,
  onRemove,
  onClear,
}: VidPanelProps) => {
  const meta = CATEGORY_META[category];
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<AllowedVidEntry | null>(null);
  const description = useMemo(() => {
    switch (category) {
      case 'speed':
        return 'These VIDs are excluded from Speed counts on the Dashboard, Master Fleet and Transporter pages. Adding a date scope makes the allow apply only on those days.';
      case 'nights':
        return 'These VIDs are excluded from Nights counts. Add specific dates for one-off overnight permissions.';
      case 'continuous':
        return 'These VIDs are excluded from Continuous-driving counts. Add specific dates for scheduled long hauls.';
    }
  }, [category]);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-950">
      <PanelHeader
        icon={Truck}
        title={`Allowed VIDs — ${meta.label}`}
        description={description}
        count={entries.length}
        onAdd={() => setAddOpen(true)}
        onClear={onClear}
        addLabel="Add VID"
      />
      <EntryList
        empty={
          entries.length === 0
            ? {
                title: 'No VIDs whitelisted yet.',
                subtitle: `Click "Add VID" to whitelist a truck for ${meta.label.toLowerCase()} events.`,
              }
            : null
        }
      >
        {entries.map((entry) => (
          <EntryCard
            key={entry.vid}
            label={entry.vid}
            monoLabel
            dates={entry.dates}
            onEdit={() => setEditEntry(entry)}
            onRemove={() => onRemove(entry.vid)}
            categoryTone={meta}
          />
        ))}
      </EntryList>

      {addOpen && (
        <EntryModal
          mode="add"
          title={`Add allowed VID — ${meta.label}`}
          subtitle="Whitelist a truck's VID. Optionally add specific dates so the rule only fires those days."
          valueLabel="VID"
          valuePlaceholder="e.g. ET-3-A12345"
          category={category}
          onSubmit={(value, dates) => {
            onAdd(value, dates);
            setAddOpen(false);
          }}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editEntry && (
        <EntryModal
          mode="edit"
          title={`Edit dates — ${editEntry.vid}`}
          subtitle={`Adjust when this VID is whitelisted for ${meta.label} events.`}
          valueLabel="VID"
          valuePlaceholder=""
          category={category}
          initialValue={editEntry.vid}
          initialDates={editEntry.dates}
          onSubmit={(_value, dates) => {
            onSetDates(editEntry.vid, dates);
            setEditEntry(null);
          }}
          onClose={() => setEditEntry(null)}
        />
      )}
    </div>
  );
};

interface LocationPanelProps {
  category: AllowedLocationCategory;
  entries: AllowedLocationEntry[];
  onAdd: (value: string, dates: string[]) => void;
  onSetDates: (value: string, dates: string[]) => void;
  onRemove: (value: string) => void;
  onClear: () => void;
}

const AllowedLocationPanel = ({
  category,
  entries,
  onAdd,
  onSetDates,
  onRemove,
  onClear,
}: LocationPanelProps) => {
  const meta = CATEGORY_META[category];
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<AllowedLocationEntry | null>(null);
  const description = useMemo(() => {
    switch (category) {
      case 'speed':
        return 'Speed events whose Overspeed Position tag contains this word are excluded. Multi-word rules like "Adama Express" require every token. Add a date scope for one-off exceptions.';
      case 'nights':
        return 'Nights rows whose Position A or B contains this word are excluded. Add dates to cover a scheduled stopover.';
      case 'continuous':
        return 'Continuous rows whose Position A or B contains this word are excluded. Add dates to cover a scheduled long run.';
    }
  }, [category]);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-950">
      <PanelHeader
        icon={MapPin}
        title={`Allowed locations — ${meta.label}`}
        description={description}
        count={entries.length}
        onAdd={() => setAddOpen(true)}
        onClear={onClear}
        addLabel="Add location"
      />
      <EntryList
        empty={
          entries.length === 0
            ? {
                title: 'No locations whitelisted yet.',
                subtitle:
                  'Add a place name (e.g. "Adama Express") or paste a coordinate line — we\'ll extract the tag.',
              }
            : null
        }
      >
        {entries.map((entry) => {
          const tag = extractRuleTag(entry.value);
          return (
            <EntryCard
              key={entry.value}
              label={tag}
              secondary={tag !== entry.value ? entry.value : undefined}
              dates={entry.dates}
              onEdit={() => setEditEntry(entry)}
              onRemove={() => onRemove(entry.value)}
              categoryTone={meta}
            />
          );
        })}
      </EntryList>

      {addOpen && (
        <EntryModal
          mode="add"
          title={`Add allowed location — ${meta.label}`}
          subtitle="Whitelist a place. Optionally add specific dates so the rule only fires those days."
          valueLabel="Location"
          valuePlaceholder="e.g. Adama Express  or  10.87 °, 42.66 ° - Djibouti"
          category={category}
          onSubmit={(value, dates) => {
            onAdd(value, dates);
            setAddOpen(false);
          }}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editEntry && (
        <EntryModal
          mode="edit"
          title={`Edit dates — ${extractRuleTag(editEntry.value)}`}
          subtitle={`Adjust when this location is whitelisted for ${meta.label} events.`}
          valueLabel="Location"
          valuePlaceholder=""
          category={category}
          initialValue={editEntry.value}
          initialDates={editEntry.dates}
          onSubmit={(_value, dates) => {
            onSetDates(editEntry.value, dates);
            setEditEntry(null);
          }}
          onClose={() => setEditEntry(null)}
        />
      )}
    </div>
  );
};

/* ── panel bits ──────────────────────────────────────────────────── */

interface PanelHeaderProps {
  icon: typeof Truck;
  title: string;
  description: string;
  count: number;
  onAdd: () => void;
  onClear: () => void;
  addLabel: string;
}

const PanelHeader = ({
  icon: Icon,
  title,
  description,
  count,
  onAdd,
  onClear,
  addLabel,
}: PanelHeaderProps) => (
  <div>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
          <Icon size={14} /> {title}
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
          {description}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
        <ShieldCheck size={11} /> {count}
      </span>
    </div>
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onAdd}
        className="btn-primary !py-1.5 !px-3 text-xs"
      >
        <Plus size={14} /> {addLabel}
      </button>
      {count > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="btn-ghost !py-1.5 !px-2 text-[11px] text-red-600 dark:text-red-400"
        >
          <Trash2 size={12} /> Clear
        </button>
      )}
    </div>
  </div>
);

interface EntryListProps {
  empty: { title: string; subtitle: string } | null;
  children: React.ReactNode;
}

const EntryList = ({ empty, children }: EntryListProps) => (
  <div className="mt-4">
    {empty ? (
      <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center dark:border-ink-800 dark:bg-ink-900/40">
        <p className="text-xs font-semibold text-ink-700 dark:text-ink-200">
          {empty.title}
        </p>
        <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">
          {empty.subtitle}
        </p>
      </div>
    ) : (
      <ul className="flex flex-col gap-2">{children}</ul>
    )}
  </div>
);

interface EntryCardProps {
  label: string;
  secondary?: string;
  monoLabel?: boolean;
  dates: string[];
  onEdit: () => void;
  onRemove: () => void;
  categoryTone: { tone: string; ring: string };
}

const EntryCard = ({
  label,
  secondary,
  monoLabel,
  dates,
  onEdit,
  onRemove,
  categoryTone,
}: EntryCardProps) => {
  const scoped = dates.length > 0;
  return (
    <li className="group rounded-xl border border-ink-100 bg-white p-3 transition hover:border-ink-200 hover:shadow-card dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={
                'truncate text-sm font-semibold text-ink-900 dark:text-white ' +
                (monoLabel ? 'font-mono' : '')
              }
              title={label}
            >
              {label}
            </span>
            {scoped ? (
              <span
                className={
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ' +
                  categoryTone.ring +
                  ' ' +
                  categoryTone.tone
                }
                title={`${dates.length} day${dates.length === 1 ? '' : 's'}`}
              >
                <CalendarClock size={10} /> {dates.length} day
                {dates.length === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                <InfinityIcon size={10} /> Every day
              </span>
            )}
          </div>
          {secondary && (
            <p
              className="mt-0.5 truncate font-mono text-[10px] text-ink-500 dark:text-ink-400"
              title={secondary}
            >
              from: {secondary}
            </p>
          )}
          {scoped && (
            <div className="mt-2 flex flex-wrap gap-1">
              {dates.slice(0, 6).map((d) => (
                <span
                  key={d}
                  className={
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 ' +
                    categoryTone.ring +
                    ' ' +
                    categoryTone.tone
                  }
                >
                  <CalendarDays size={9} />
                  {formatDateKey(d)}
                </span>
              ))}
              {dates.length > 6 && (
                <span className="inline-flex items-center rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                  +{dates.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit dates"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white"
            title="Edit dates"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            title="Remove"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </li>
  );
};

/* ── modal for add / edit ────────────────────────────────────────── */

interface EntryModalProps {
  mode: 'add' | 'edit';
  title: string;
  subtitle: string;
  valueLabel: string;
  valuePlaceholder: string;
  category: Category;
  initialValue?: string;
  initialDates?: string[];
  onSubmit: (value: string, dates: string[]) => void;
  onClose: () => void;
}

const EntryModal = ({
  mode,
  title,
  subtitle,
  valueLabel,
  valuePlaceholder,
  category,
  initialValue = '',
  initialDates = [],
  onSubmit,
  onClose,
}: EntryModalProps) => {
  const meta = CATEGORY_META[category];
  const [value, setValue] = useState(initialValue);
  const [dates, setDates] = useState<string[]>(() =>
    [...initialDates].sort(),
  );
  const [scope, setScope] = useState<'always' | 'dates'>(
    initialDates.length > 0 ? 'dates' : 'always',
  );

  const toggleDate = (key: string) => {
    setDates((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key].sort(),
    );
  };

  const removeDate = (key: string) => {
    setDates((prev) => prev.filter((d) => d !== key));
  };

  const submit = () => {
    const finalValue = value.trim();
    if (!finalValue) return;
    const finalDates = scope === 'dates' ? dates : [];
    onSubmit(finalValue, finalDates);
  };

  const valid = value.trim().length > 0 && (scope === 'always' || dates.length > 0);
  const disabledDatesTip = scope === 'dates' && dates.length === 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      widthClassName="w-[92vw] max-w-[720px]"
    >
      <div className="flex flex-col gap-5">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {valueLabel}
          </label>
          {mode === 'add' ? (
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={valuePlaceholder}
              className="input-base mt-1 w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && valid) submit();
              }}
            />
          ) : (
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm text-ink-800 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100">
              <ShieldCheck size={14} className="text-ink-500 dark:text-ink-400" />
              <span
                className="truncate font-mono"
                title={initialValue}
              >
                {initialValue}
              </span>
            </div>
          )}
        </div>

        <ScopeToggle
          scope={scope}
          onChange={setScope}
          categoryTone={meta}
          scopedCount={dates.length}
        />

        {scope === 'dates' && (
          <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3 dark:border-ink-800 dark:bg-ink-900/40">
            <MultiDatePicker
              selected={dates}
              onToggle={toggleDate}
              categoryTone={meta}
            />
            {dates.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                    {dates.length} date{dates.length === 1 ? '' : 's'} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setDates([])}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dates.map((d) => (
                    <span
                      key={d}
                      className={
                        'inline-flex items-center gap-1 rounded-full py-0.5 pl-2 pr-1 font-mono text-[10px] ring-1 ' +
                        meta.ring +
                        ' ' +
                        meta.tone
                      }
                    >
                      {formatDateKey(d)}
                      <button
                        type="button"
                        onClick={() => removeDate(d)}
                        aria-label={`Remove ${d}`}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/60 text-current transition hover:bg-white dark:bg-white/10 dark:hover:bg-white/20"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800 sm:flex-row sm:items-center">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            title={
              disabledDatesTip
                ? 'Pick at least one date or switch to "Every day"'
                : undefined
            }
            className="btn-primary"
          >
            <ShieldCheck size={14} />
            {mode === 'add' ? 'Add whitelist entry' : 'Save changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface ScopeToggleProps {
  scope: 'always' | 'dates';
  onChange: (s: 'always' | 'dates') => void;
  categoryTone: { tone: string; ring: string };
  scopedCount: number;
}

const ScopeToggle = ({
  scope,
  onChange,
  categoryTone,
  scopedCount,
}: ScopeToggleProps) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
      When should this rule apply?
    </div>
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <ScopeOption
        active={scope === 'always'}
        onClick={() => onChange('always')}
        icon={InfinityIcon}
        title="Every day"
        description="The rule always applies — this VID or location is permanently whitelisted."
        tone={null}
      />
      <ScopeOption
        active={scope === 'dates'}
        onClick={() => onChange('dates')}
        icon={CalendarRange}
        title="Specific dates"
        description={
          scopedCount > 0
            ? `Applies only on the ${scopedCount} selected day${scopedCount === 1 ? '' : 's'}.`
            : 'Applies only on the dates you pick below.'
        }
        tone={categoryTone}
      />
    </div>
  </div>
);

interface ScopeOptionProps {
  active: boolean;
  onClick: () => void;
  icon: typeof Truck;
  title: string;
  description: string;
  tone: { tone: string; ring: string } | null;
}

const ScopeOption = ({
  active,
  onClick,
  icon: Icon,
  title,
  description,
  tone,
}: ScopeOptionProps) => (
  <button
    type="button"
    onClick={onClick}
    className={
      'flex items-start gap-3 rounded-xl border p-3 text-left transition ' +
      (active
        ? 'border-brand-blue bg-brand-blue-soft shadow-card'
        : 'border-brand-blue-line bg-white hover:border-brand-blue')
    }
  >
    <span
      className={
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ' +
        (active && tone
          ? tone.ring + ' ' + tone.tone
          : active
            ? 'bg-brand-blue text-white ring-brand-blue'
            : 'bg-brand-blue-soft text-brand-blue ring-brand-blue-line')
      }
    >
      <Icon size={14} />
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-ink-900 dark:text-white">
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
        {description}
      </p>
    </div>
  </button>
);

/* ── multi date picker (mini calendar) ───────────────────────────── */

interface MultiDatePickerProps {
  selected: string[];
  onToggle: (key: string) => void;
  categoryTone: { tone: string; ring: string };
}

const MultiDatePicker = ({
  selected,
  onToggle,
  categoryTone,
}: MultiDatePickerProps) => {
  const today = useMemo(() => new Date(), []);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  // Anchor the calendar to the earliest selected date on first render so
  // editing an existing entry opens on a relevant month; fall back to today.
  const [viewYear, setViewYear] = useState(() =>
    selected.length > 0 ? parseDateKey(selected[0]).y : today.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(() =>
    selected.length > 0 ? parseDateKey(selected[0]).m : today.getMonth(),
  );

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  const jumpToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3 dark:border-ink-800 dark:bg-ink-950">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous month"
          className="rounded-md p-1 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={jumpToday}
          className="rounded-md px-3 py-1 text-sm font-semibold text-ink-900 transition hover:bg-ink-100 dark:text-white dark:hover:bg-ink-800"
          title="Jump to this month"
        >
          {MONTH_LABELS[viewMonth]} {viewYear}
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next month"
          className="rounded-md p-1 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-ink-400">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (c === null) return <div key={i} className="h-9 w-9" />;
          const key = toDateKey(viewYear, viewMonth, c);
          const isSelected = selectedSet.has(key);
          const isToday =
            today.getFullYear() === viewYear &&
            today.getMonth() === viewMonth &&
            today.getDate() === c;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(key)}
              className={
                'relative flex h-9 w-9 items-center justify-center rounded-lg text-xs transition ' +
                (isSelected
                  ? 'font-semibold ring-1 ' +
                    categoryTone.ring +
                    ' ' +
                    categoryTone.tone
                  : isToday
                    ? 'font-semibold text-ink-900 ring-1 ring-inset ring-ink-300 dark:text-white dark:ring-ink-600'
                    : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800')
              }
            >
              {c}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[10px] text-ink-500 dark:text-ink-400">
        Click any day to toggle it. Selected days highlight in the type's color.
      </p>
    </div>
  );
};
