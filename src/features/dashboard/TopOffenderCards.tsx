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
  /** Left accent bar colour (CSS var). */
  barColor: string;
  /** Pip background/text colours. */
  pipBg: string;
  pipColor: string;
  pipBorder: string;
  subtitle: string;
  countLabel: string;
}

const BLUE = 'var(--color-brand-blue)';
const BLUE_DARK = 'var(--color-brand-blue-dark)';
const BLUE_SOFT = 'var(--color-brand-blue-soft)';
const BLUE_LINE = 'var(--color-brand-blue-line)';
const ORANGE = 'var(--color-brand-accent)';
const ORANGE_DARK = 'var(--color-brand-accent-dark)';
const ORANGE_SOFT = 'var(--color-brand-accent-soft)';
const ORANGE_LINE = 'var(--color-brand-accent-line)';

const CARDS: CardMeta[] = [
  {
    key: 'combined',
    label: 'Top overall offender',
    icon: Crown,
    accent: ORANGE_DARK,
    barColor: ORANGE,
    pipBg: ORANGE_SOFT,
    pipColor: ORANGE_DARK,
    pipBorder: ORANGE_LINE,
    subtitle: 'Highest across Speed + Nights + Continuous',
    countLabel: 'combined',
  },
  {
    key: 'speed',
    label: 'Top speed offender',
    icon: Gauge,
    accent: 'var(--color-brand-red)',
    barColor: 'var(--color-brand-red)',
    pipBg: 'var(--color-red-light)',
    pipColor: 'var(--color-brand-red-dark)',
    pipBorder: 'var(--color-brand-red-muted)',
    subtitle: 'Most overspeed events passing threshold',
    countLabel: 'speed events',
  },
  {
    key: 'nights',
    label: 'Top nights offender',
    icon: Moon,
    accent: BLUE_DARK,
    barColor: BLUE,
    pipBg: BLUE_SOFT,
    pipColor: BLUE_DARK,
    pipBorder: BLUE_LINE,
    subtitle: 'Most night-driving flags',
    countLabel: 'night flags',
  },
  {
    key: 'continuous',
    label: 'Top continuous offender',
    icon: RouteIcon,
    accent: ORANGE_DARK,
    barColor: ORANGE,
    pipBg: ORANGE_SOFT,
    pipColor: ORANGE_DARK,
    pipBorder: ORANGE_LINE,
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
    <div className="group card-base relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-elev">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: meta.barColor }}
      />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-brand-accent)' }}
          >
            {meta.label}
          </p>
          <h3
            className="mt-1 truncate font-display text-xl font-semibold tracking-tight"
            style={{ color: BLUE_DARK }}
          >
            {empty ? 'No data yet' : data.driverName || 'Not found'}
          </h3>
          <p
            className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
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
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105"
          style={{
            background: meta.pipBg,
            color: meta.pipColor,
            border: `1px solid ${meta.pipBorder}`,
          }}
        >
          <Icon size={18} />
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p
            className="font-display text-4xl font-semibold leading-none tracking-tight"
            style={{ color: empty ? BLUE_DARK : meta.accent }}
          >
            {empty ? 0 : data.count}
          </p>
          <p
            className="mt-1 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {meta.countLabel}
          </p>
        </div>
        {!empty && data.breakdown && (
          <div
            className="text-right text-[11px] leading-tight"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p>
              <span className="font-semibold" style={{ color: BLUE_DARK }}>
                {data.breakdown.speed}
              </span>{' '}
              speed
            </p>
            <p>
              <span className="font-semibold" style={{ color: BLUE_DARK }}>
                {data.breakdown.nights}
              </span>{' '}
              nights
            </p>
            <p>
              <span className="font-semibold" style={{ color: BLUE_DARK }}>
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
