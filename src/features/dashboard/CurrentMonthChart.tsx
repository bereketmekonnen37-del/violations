import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

export interface DailyBucket {
  /** 1..31 */
  day: number;
  speed: number;
  nights: number;
  continuous: number;
}

interface Props {
  data: DailyBucket[];
  monthLabel: string;
  height?: number;
}

interface ChartPoint extends DailyBucket {
  total: number;
}

const KIND_META = {
  speed: {
    label: 'Speed',
    gradientId: 'cmc-grad-speed',
    from: '#FFB15E',
    to: '#F26A14',
    glow: 'rgba(242, 106, 20, 0.45)',
  },
  nights: {
    label: 'Nights',
    gradientId: 'cmc-grad-nights',
    from: '#7A8DD6',
    to: '#2E3F7B',
    glow: 'rgba(62, 85, 165, 0.45)',
  },
  continuous: {
    label: 'Continuous',
    gradientId: 'cmc-grad-cont',
    from: '#34D399',
    to: '#047857',
    glow: 'rgba(5, 150, 105, 0.45)',
  },
} as const;

const ChartTooltip = ({ active, payload }: TooltipContentProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as ChartPoint;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-elev backdrop-blur"
      style={{
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid var(--color-brand-blue-line)',
        minWidth: 176,
      }}
    >
      <p
        className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-brand-blue)' }}
      >
        Day {point.day}
      </p>
      {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => (
        <div
          key={k}
          className="flex items-center justify-between gap-6 py-0.5"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{
                background: `linear-gradient(180deg, ${KIND_META[k].from}, ${KIND_META[k].to})`,
                boxShadow: `0 0 6px ${KIND_META[k].glow}`,
              }}
            />
            {KIND_META[k].label}
          </span>
          <span
            className="font-mono font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {point[k]}
          </span>
        </div>
      ))}
      <div
        className="mt-1.5 flex items-center justify-between gap-6 pt-1.5 text-[11px] font-semibold uppercase tracking-wider"
        style={{ borderTop: '1px solid var(--color-brand-blue-line)' }}
      >
        <span style={{ color: 'var(--color-text-secondary)' }}>Total</span>
        <span
          className="font-mono text-sm"
          style={{ color: 'var(--color-brand-blue-dark)' }}
        >
          {point.total}
        </span>
      </div>
    </div>
  );
};

export const CurrentMonthChart = ({ data, monthLabel, height = 360 }: Props) => {
  const points: ChartPoint[] = useMemo(
    () =>
      data.map((d) => ({ ...d, total: d.speed + d.nights + d.continuous })),
    [data],
  );

  const isAllZero = useMemo(
    () => points.every((p) => p.total === 0),
    [points],
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        background:
          'linear-gradient(145deg, rgba(62,85,165,0.08) 0%, rgba(244,130,33,0.05) 100%)',
        padding: '20px 8px 8px 8px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(62,85,165,0.10), transparent 60%)',
        }}
      />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={points}
          margin={{ top: 24, right: 16, left: -8, bottom: 4 }}
          barCategoryGap="22%"
        >
          <defs>
            {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map(
              (k) => (
                <linearGradient
                  key={k}
                  id={KIND_META[k].gradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={KIND_META[k].from} stopOpacity={1} />
                  <stop offset="100%" stopColor={KIND_META[k].to} stopOpacity={0.92} />
                </linearGradient>
              ),
            )}
            <filter id="cmc-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.65 }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.15 }}
            tickLine={false}
            interval={0}
            minTickGap={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={ChartTooltip}
            cursor={{ fill: '#3E55A5', fillOpacity: 0.06 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="circle"
            iconSize={10}
            wrapperStyle={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              paddingBottom: 4,
            }}
          />
          {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map(
            (k, i, arr) => (
              <Bar
                key={k}
                dataKey={k}
                name={KIND_META[k].label}
                stackId="violations"
                fill={`url(#${KIND_META[k].gradientId})`}
                radius={i === arr.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                filter="url(#cmc-glow)"
                isAnimationActive
                animationDuration={700}
              />
            ),
          )}
        </BarChart>
      </ResponsiveContainer>

      <div
        className="pointer-events-none absolute left-5 top-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: 'var(--color-brand-blue)' }}
      >
        {monthLabel}
      </div>

      {isAllZero && (
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          No saved violations for {monthLabel} yet.
        </div>
      )}
    </div>
  );
};
