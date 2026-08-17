import {
  Crown,
  Gauge,
  IdCard,
  Moon,
  Route as RouteIcon,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type {
  DashboardTopOffenders,
  TopOffender,
} from '../../lib/dashboardAnalytics';

interface Props {
  top: DashboardTopOffenders;
}

interface CardMeta {
  key: keyof DashboardTopOffenders;
  label: string;
  icon: LucideIcon;
  accent: string;
  /** Tailwind classes for the left accent bar (solid colour, no gradient). */
  bar: string;
  /** Tailwind classes for the icon "pip". */
  pip: string;
  subtitle: string;
  countLabel: string;
}

const CARDS: CardMeta[] = [
  {
    key: 'combined',
    label: 'Top overall offender',
    icon: Crown,
    accent: '#b45309', // amber-700
    bar: 'bg-amber-400',
    pip: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
    subtitle: 'Highest across Speed + Nights + Continuous',
    countLabel: 'combined',
  },
  {
    key: 'speed',
    label: 'Top speed offender',
    icon: Gauge,
    accent: '#dc2626', // red-600
    bar: 'bg-red-500',
    pip: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
    subtitle: 'Most overspeed events passing threshold',
    countLabel: 'speed events',
  },
  {
    key: 'nights',
    label: 'Top nights offender',
    icon: Moon,
    accent: '#4f46e5', // indigo-600
    bar: 'bg-indigo-500',
    pip: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30',
    subtitle: 'Most night-driving flags',
    countLabel: 'night flags',
  },
  {
    key: 'continuous',
    label: 'Top continuous offender',
    icon: RouteIcon,
    accent: '#d97706', // amber-600
    bar: 'bg-orange-500',
    pip: 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30',
    subtitle: 'Most continuous-driving flags',
    countLabel: 'continuous flags',
  },
];

export const TopOffenderCards = ({ top }: Props) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((meta) => (
        <OffenderCard key={meta.key} meta={meta} data={top[meta.key]} />
      ))}
    </div>
  );
};

interface OffenderCardProps {
  meta: CardMeta;
  data: TopOffender | null;
}

const OffenderCard = ({ meta, data }: OffenderCardProps) => {
  const Icon = meta.icon;
  const empty = !data || data.count === 0;

  return (
    <div className="group surface relative overflow-hidden rounded-2xl p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-elev">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
            {meta.label}
          </p>
          <h3 className="mt-1 truncate font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
            {empty ? 'No data yet' : data.driverName || 'Not found'}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-600 dark:text-ink-300">
            {empty ? (
              <span className="italic">Once staff upload data, this card will light up.</span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <IdCard size={12} /> VID {data.vid}
                </span>
                {data.transporter && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1 truncate">
                      <Truck size={12} /> {data.transporter}
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105 ${meta.pip}`}
        >
          <Icon size={18} />
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p
            className="font-display text-4xl font-semibold leading-none tracking-tight"
            style={{ color: empty ? undefined : meta.accent }}
          >
            {empty ? 0 : data.count}
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {meta.countLabel}
          </p>
        </div>
        {!empty && data.breakdown && (
          <div className="text-right text-[11px] leading-tight text-ink-600 dark:text-ink-300">
            <p>
              <span className="font-semibold text-ink-900 dark:text-white">
                {data.breakdown.speed}
              </span>{' '}
              speed
            </p>
            <p>
              <span className="font-semibold text-ink-900 dark:text-white">
                {data.breakdown.nights}
              </span>{' '}
              nights
            </p>
            <p>
              <span className="font-semibold text-ink-900 dark:text-white">
                {data.breakdown.continuous}
              </span>{' '}
              cont.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export { CARDS as TOP_OFFENDER_CARDS };
