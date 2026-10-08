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

export interface MonthlyUploadBucket {
  /** YYYY-MM, e.g. 2026-01 */
  month: string;
  speed: number;
  nights: number;
  continuous: number;
}

interface Props {
  data: MonthlyUploadBucket[];
  height?: number;
}

interface ChartPoint extends MonthlyUploadBucket {
  total: number;
}

const BRAND_BLUE = '#3E55A5';

const KIND_META = {
  speed: { label: 'Speed', color: '#F48221' },
  nights: { label: 'Nights', color: BRAND_BLUE },
  continuous: { label: 'Continuous', color: '#059669' },
} as const;

const monthLabel = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const monthLabelLong = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
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
        {monthLabelLong(point.month)}
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
        <span style={{ color: 'var(--color-text-secondary)' }}>Total uploads</span>
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

export const MonthlyUploadsChart = ({ data, height = 320 }: Props) => {
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
    <div className="relative w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={points}
          margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.15 }}
            tickLine={false}
            minTickGap={16}
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
            cursor={{ fill: BRAND_BLUE, fillOpacity: 0.06 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="square"
            iconSize={12}
            wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
          />
          {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => (
            <Bar
              key={k}
              dataKey={k}
              name={KIND_META[k].label}
              stackId="uploads"
              fill={KIND_META[k].color}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {isAllZero && (
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          No uploads recorded yet.
        </div>
      )}
    </div>
  );
};
