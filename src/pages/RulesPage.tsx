import { useState, type FormEvent } from 'react';
import {
  Gauge,
  MapPin,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Route as RouteIcon,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import {
  DEFAULT_RULE_THRESHOLDS,
  addAllowedLocation,
  addAllowedVid,
  clearAllowedLocations,
  clearAllowedVids,
  removeAllowedLocation,
  removeAllowedVid,
  resetThresholds,
  setThresholds,
  type AllowedLocationCategory,
  type AllowedVidCategory,
  type RuleThresholds,
} from '../features/rules/rulesSlice';
import { extractRuleTag } from '../lib/locationRules';

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

interface VidCardMeta {
  category: AllowedVidCategory;
  icon: typeof Truck;
  title: string;
  description: string;
}

const VID_CARDS: VidCardMeta[] = [
  {
    category: 'speed',
    icon: Gauge,
    title: 'Allowed VIDs — Speed',
    description:
      "Speed events for these VIDs are subtracted from every Speed count on the Dashboard, Master Fleet and Transporter pages. Doesn't affect Nights or Continuous counts.",
  },
  {
    category: 'nights',
    icon: Moon,
    title: 'Allowed VIDs — Nights',
    description:
      "Nights rows for these VIDs are subtracted from every Nights count on the Dashboard, Master Fleet and Transporter pages. Doesn't affect Speed or Continuous counts.",
  },
  {
    category: 'continuous',
    icon: RouteIcon,
    title: 'Allowed VIDs — Continuous',
    description:
      "Continuous rows for these VIDs are subtracted from every Continuous count on the Dashboard, Master Fleet and Transporter pages. Doesn't affect Speed or Nights counts.",
  },
];

interface LocationCardMeta {
  category: AllowedLocationCategory;
  icon: typeof MapPin;
  title: string;
  description: string;
}

const LOCATION_CARDS: LocationCardMeta[] = [
  {
    category: 'speed',
    icon: Gauge,
    title: 'Allowed locations — Speed',
    description:
      'Speed events whose Overspeed Position tag contains this word are subtracted from every Speed count. Match is whole-word, case-insensitive: adding "Adama" flags both "Adama" and "Addis Adama Express"; adding "Express" flags any tag containing "Express". Multi-word rules like "Adama Express" match tags that contain every word. You can paste a full coordinate line — we\'ll extract the location name after the dash.',
  },
  {
    category: 'nights',
    icon: Moon,
    title: 'Allowed locations — Nights',
    description:
      'Nights rows whose Position A or Position B contains the word are subtracted from every Nights count. Same whole-word matching as Speed — "Adama" flags "Addis Adama Express" too. Doesn\'t affect Speed or Continuous.',
  },
  {
    category: 'continuous',
    icon: RouteIcon,
    title: 'Allowed locations — Continuous',
    description:
      'Continuous rows whose Position A or Position B contains the word are subtracted from every Continuous count. Same whole-word matching as Speed. Doesn\'t affect Speed or Nights.',
  },
];

export const RulesPage = () => {
  const dispatch = useAppDispatch();
  const thresholds = useAppSelector((s) => s.rules.thresholds);
  const allowedVidsByType = useAppSelector((s) => s.rules.allowedVidsByType);
  const allowedLocationsByType = useAppSelector(
    (s) => s.rules.allowedLocationsByType,
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Manager workspace"
        title="Rules"
        subtitle="Set the filters Master Fleet uses. Change the duration threshold per violation type, whitelist VIDs per violation source (Speed / Nights / Continuous), and whitelist speed locations (highways, border crossings)."
      />

      <div className="space-y-8">
        <ThresholdsCard
          thresholds={thresholds}
          onChange={(t) => dispatch(setThresholds(t))}
          onReset={() => dispatch(resetThresholds())}
        />

        {VID_CARDS.map((meta) => (
          <AllowedListCard
            key={meta.category}
            icon={meta.icon}
            title={meta.title}
            description={meta.description}
            placeholder="e.g. ET-3-A12345"
            items={allowedVidsByType[meta.category]}
            onAdd={(v) => dispatch(addAllowedVid({ category: meta.category, value: v }))}
            onRemove={(v) =>
              dispatch(removeAllowedVid({ category: meta.category, value: v }))
            }
            onClear={() => dispatch(clearAllowedVids(meta.category))}
            previewItem={(v) => v}
          />
        ))}

        {LOCATION_CARDS.map((meta) => (
          <AllowedListCard
            key={`loc-${meta.category}`}
            icon={meta.icon}
            title={meta.title}
            description={meta.description}
            placeholder="e.g. Adama Express  or  10.87 °, 42.66 ° - Djibouti"
            items={allowedLocationsByType[meta.category]}
            onAdd={(v) =>
              dispatch(addAllowedLocation({ category: meta.category, value: v }))
            }
            onRemove={(v) =>
              dispatch(
                removeAllowedLocation({ category: meta.category, value: v }),
              )
            }
            onClear={() => dispatch(clearAllowedLocations(meta.category))}
            previewItem={(v) => {
              const tag = extractRuleTag(v);
              return tag === v ? v : `${tag}  ·  from: ${v}`;
            }}
          />
        ))}
      </div>
    </div>
  );
};

/* ── Thresholds card ─────────────────────────────────────────────── */

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

/* ── Allowed list (reusable for VIDs + locations) ────────────────── */

interface AllowedListCardProps {
  icon: typeof Truck;
  title: string;
  description: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  onClear: () => void;
  previewItem: (value: string) => string;
}

const AllowedListCard = ({
  icon: Icon,
  title,
  description,
  placeholder,
  items,
  onAdd,
  onRemove,
  onClear,
  previewItem,
}: AllowedListCardProps) => {
  const [value, setValue] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue('');
  };

  return (
    <section className="surface rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-white">
            <Icon size={16} /> {title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-ink-500 dark:text-ink-400">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
            <ShieldCheck size={11} /> {items.length}
          </span>
          {items.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="btn-ghost !py-1 !px-2 text-xs text-red-600 dark:text-red-400"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="input-base flex-1"
        />
        <button type="submit" className="btn-primary sm:w-auto" disabled={!value.trim()}>
          <Plus size={16} /> Add
        </button>
      </form>

      <div className="mt-4">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-6 text-center text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
            Nothing whitelisted yet.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {items.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-2 rounded-full bg-red-50 py-1 pl-3 pr-1 text-xs font-medium text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
                title={item}
              >
                <span className="truncate max-w-[280px]">{previewItem(item)}</span>
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  aria-label={`Remove ${item}`}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-800 transition hover:bg-red-200 dark:bg-red-900/60 dark:text-red-100 dark:hover:bg-red-800"
                >
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
