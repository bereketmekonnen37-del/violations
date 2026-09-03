import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { DailyBucket } from '../../lib/dashboardAnalytics';

interface Props {
  data: DailyBucket[];
  /** Height in pixels. Width fills the container. */
  height?: number;
}

interface ChartPoint extends DailyBucket {
  total: number;
}

const BRAND_BLUE = '#3E55A5';

const KIND_META = {
  speed: { label: 'Speed', color: '#F48221' },
  nights: { label: 'Nights', color: BRAND_BLUE },
  continuous: { label: 'Continuous', color: '#6B7FC4' },
} as const;

const dayLabel = (isoDate: string): string => {
  const d = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const dayLabelLong = (isoDate: string): string => {
  const d = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ChartTooltip = ({ active, payload }: TooltipContentProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as ChartPoint;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-elev"
      style={{
        background: '#ffffff',
        border: '1px solid var(--color-brand-blue-line)',
        minWidth: 176,
      }}
    >
      <p
        className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-brand-blue)' }}
      >
        {dayLabelLong(point.date)}
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
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: KIND_META[k].color }}
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

export const DailyViolationsChart = ({ data, height = 320 }: Props) => {
  const points: ChartPoint[] = useMemo(
    () =>
      data.map((d) => ({ ...d, total: d.speed + d.nights + d.continuous })),
    [data],
  );

  const isAllZero = useMemo(
    () => points.every((p) => p.total === 0),
    [points],
  );

  // Thin the X-axis labels so long histories (months of data) stay legible
  // instead of overlapping.
  const tickInterval = Math.max(0, Math.ceil(points.length / 10) - 1);

  return (
    <div className="relative w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={points}
          margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="dailyTotalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_BLUE} stopOpacity={0.32} />
              <stop offset="100%" stopColor={BRAND_BLUE} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <XAxis
            dataKey="date"
            tickFormatter={dayLabel}
            interval={tickInterval}
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.15 }}
            tickLine={false}
            minTickGap={24}
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
            cursor={{ stroke: BRAND_BLUE, strokeOpacity: 0.25, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Total violations"
            stroke={BRAND_BLUE}
            strokeWidth={2.5}
            fill="url(#dailyTotalFill)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {isAllZero && (
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          No violations recorded yet.
        </div>
      )}
    </div>
  );
};
