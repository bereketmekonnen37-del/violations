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
import type { TransporterAnalyticsRow } from '../../lib/transporterAnalytics';

interface Props {
  rows: TransporterAnalyticsRow[];
  /** How many transporters to plot, highest total first. */
  limit?: number;
}

// Same validated categorical triple used on the Dashboard trend chart —
// worst adjacent-pair ΔE 24.0 normal-vision / 21.5 CVD.
const KIND_META = {
  speed: { key: 'speed', label: 'Speed', color: '#F48221' },
  nights: { key: 'nights', label: 'Nights', color: '#3E55A5' },
  continuous: { key: 'continuous', label: 'Continuous', color: '#059669' },
} as const;

const truncateName = (name: string, max = 22): string =>
  name.length > max ? `${name.slice(0, max - 1)}…` : name;

const ChartTooltip = ({ active, payload }: TooltipContentProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as TransporterAnalyticsRow;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-elev"
      style={{
        background: '#ffffff',
        border: '1px solid var(--color-brand-blue-line)',
        minWidth: 190,
      }}
    >
      <p
        className="mb-2 truncate text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-brand-blue)' }}
        title={point.name}
      >
        {point.name}
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

export const TransporterViolationsChart = ({ rows, limit = 10 }: Props) => {
  const data = useMemo(() => {
    return rows
      .filter((r) => r.total > 0)
      .slice(0, limit)
      .map((r) => ({ ...r, shortName: truncateName(r.name) }))
      .reverse(); // Recharts vertical bars render bottom-up — reverse so #1 sits on top.
  }, [rows, limit]);

  const withData = rows.filter((r) => r.total > 0).length;
  const height = Math.max(180, data.length * 40 + 40);

  if (data.length === 0) {
    return (
      <div
        className="flex h-40 items-center justify-center rounded-xl text-sm"
        style={{
          background: 'var(--color-brand-blue-soft)',
          border: '1px dashed var(--color-brand-blue-line)',
          color: 'var(--color-text-muted)',
        }}
      >
        No transporter violations recorded yet.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          barCategoryGap={10}
          margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.15 }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={140}
            tick={{ fontSize: 11.5, fill: 'currentColor', opacity: 0.85 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={ChartTooltip}
            cursor={{ fill: 'var(--color-brand-blue)', fillOpacity: 0.06 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="square"
            iconSize={10}
            wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
          />
          {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              name={KIND_META[k].label}
              stackId="violations"
              fill={KIND_META[k].color}
              radius={i === 2 ? [0, 3, 3, 0] : undefined}
              maxBarSize={22}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      {withData > limit && (
        <p
          className="mt-1 text-right text-[11px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Showing top {limit} of {withData} transporters with violations.
        </p>
      )}
    </div>
  );
};
