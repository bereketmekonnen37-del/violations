import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { subscribeToasts, toast, type ToastItem, type ToastKind } from './toastStore';

const KIND_STYLE: Record<
  ToastKind,
  {
    ring: string;
    iconBg: string;
    iconColor: string;
    accent: string;
    Icon: typeof CheckCircle2;
    ariaRole: 'status' | 'alert';
    /** Faint radial glow behind the panel. */
    glow: string;
  }
> = {
  success: {
    ring: 'ring-1 ring-emerald-200',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    accent: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
    Icon: CheckCircle2,
    ariaRole: 'status',
    glow:
      'radial-gradient(160px 100px at 24px 50%, rgba(16, 185, 129, 0.18), transparent 70%)',
  },
  error: {
    ring: 'ring-1 ring-red-200',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    accent: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
    Icon: AlertTriangle,
    ariaRole: 'alert',
    glow:
      'radial-gradient(160px 100px at 24px 50%, rgba(220, 38, 38, 0.20), transparent 70%)',
  },
  info: {
    ring: 'ring-1 ring-brand-blue-line',
    iconBg: 'bg-brand-blue-soft',
    iconColor: 'text-brand-blue-dark',
    accent: 'linear-gradient(180deg, #3e55a5 0%, #2a3a72 100%)',
    Icon: Info,
    ariaRole: 'status',
    glow:
      'radial-gradient(160px 100px at 24px 50%, rgba(62, 85, 165, 0.18), transparent 70%)',
  },
  loading: {
    ring: 'ring-1 ring-brand-blue-line',
    iconBg: 'bg-brand-blue-soft',
    iconColor: 'text-brand-blue',
    accent: 'linear-gradient(180deg, #6b7fc4 0%, #3e55a5 100%)',
    Icon: Loader2,
    ariaRole: 'status',
    glow:
      'radial-gradient(160px 100px at 24px 50%, rgba(107, 127, 196, 0.22), transparent 70%)',
  },
};

export const ToastHost = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-3 sm:top-5"
      aria-live="polite"
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
      <style>{`
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes toastShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

const ToastCard = ({ item }: { item: ToastItem }) => {
  const s = KIND_STYLE[item.kind];
  const Icon = s.Icon;

  return (
    <div
      role={s.ariaRole}
      className={`pointer-events-auto relative flex w-full max-w-md items-start gap-3 overflow-hidden rounded-2xl bg-white/95 px-4 py-3 shadow-2xl backdrop-blur ${s.ring}`}
      style={{
        boxShadow:
          '0 24px 40px -18px rgba(15, 20, 40, 0.35), 0 0 0 1px rgba(15, 20, 40, 0.04)',
        animation: 'toastIn 220ms cubic-bezier(0.2, 0.9, 0.25, 1)',
      }}
    >
      {/* Left accent bar */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: s.accent }}
      />
      {/* Faint colored glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: s.glow }}
      />
      {/* Shimmer on loading */}
      {item.kind === 'loading' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(62, 85, 165, 0.08), transparent)',
            animation: 'toastShimmer 1.8s ease-in-out infinite',
          }}
        />
      )}

      {/* Icon */}
      <span
        className={`relative mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}
      >
        <Icon
          size={16}
          className={`${s.iconColor} ${item.kind === 'loading' ? 'animate-spin' : ''}`}
        />
        {item.kind === 'success' && (
          <Sparkles
            size={9}
            className="absolute -right-0.5 -top-0.5 text-amber-400"
          />
        )}
      </span>

      {/* Body */}
      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-xs text-ink-500">{item.description}</p>
        )}
      </div>

      {/* Close (not shown while loading — the caller controls dismissal) */}
      {item.kind !== 'loading' && (
        <button
          type="button"
          onClick={() => toast.dismiss(item.id)}
          className="relative -mr-1 rounded-full p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
