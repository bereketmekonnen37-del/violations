import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DayStat, HourStat } from '../../lib/snapshots';

// Same categorical triple as the Dashboard and Transporter charts.
const KIND_COLORS = {
  speed: '#F48221',
  nights: '#3E55A5',
  continuous: '#059669',
} as const;
const KIND_LABELS = { speed: 'Speed', nights: 'Nights', continuous: 'Continuous' } as const;
type Kind = keyof typeof KIND_COLORS;
const KINDS: Kind[] = ['speed', 'nights', 'continuous'];

const AXIS_TICK = { fontSize: 11, fill: 'currentColor', opacity: 0.6 };
const AXIS_LINE = { stroke: 'currentColor', strokeOpacity: 0.15 };
const LEGEND_STYLE = { fontSize: 12, color: 'var(--color-text-secondary)' };

const truncate = (s: string, max: number): string =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

const Empty = ({ children }: { children: string }) => (
  <div
    className="flex h-40 items-center justify-center rounded-xl text-sm"
    style={{
      background: 'var(--color-brand-blue-soft)',
      border: '1px dashed var(--color-brand-blue-line)',
      color: 'var(--color-text-muted)',
    }}
  >
    {children}
  </div>
);

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid var(--color-brand-blue-line)',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(15,20,40,0.12)',
};

interface StackedRow {
  name: string;
  speed: number;
  nights: number;
  continuous: number;
  total: number;
}

/** Horizontal stacked bars, highest first (used for transporters and VIDs). */
export const StackedRankChart = ({
  rows,
  emptyText,
  labelWidth = 150,
}: {
  rows: StackedRow[];
  emptyText: string;
  labelWidth?: number;
}) => {
  if (rows.length === 0) return <Empty>{emptyText}</Empty>;
  const data = rows
    .map((r) => ({ ...r, short: truncate(r.name, 24) }))
    .reverse(); // vertical bars render bottom-up; put #1 on top
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40 + 50)}>
      <BarChart data={data} layout="vertical" barCategoryGap={10} margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.08} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
        <YAxis
          type="category"
          dataKey="short"
          width={labelWidth}
          tick={{ fontSize: 11.5, fill: 'currentColor', opacity: 0.85 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-brand-blue)', fillOpacity: 0.06 }} />
        <Legend verticalAlign="top" align="right" height={28} iconType="square" iconSize={10} wrapperStyle={LEGEND_STYLE} />
        {KINDS.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            name={KIND_LABELS[k]}
            stackId="v"
            fill={KIND_COLORS[k]}
            radius={i === 2 ? [0, 3, 3, 0] : undefined}
            maxBarSize={22}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

/** Share of violations by type. */
export const TypeDonut = ({
  totals,
}: {
  totals: { speed: number; nights: number; continuous: number; total: number };
}) => {
  if (totals.total === 0) return <Empty>No counted violations in this saved copy.</Empty>;
  const data = KINDS.map((k) => ({ name: KIND_LABELS[k], value: totals[k], color: KIND_COLORS[k] }));
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={68}
            outerRadius={98}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend verticalAlign="bottom" iconType="square" iconSize={10} wrapperStyle={LEGEND_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[88px] text-center">
        <p className="font-display text-3xl font-semibold" style={{ color: 'var(--color-brand-blue-dark)' }}>
          {totals.total.toLocaleString()}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          violations
        </p>
      </div>
    </div>
  );
};

const formatDay = (iso: string): string => {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
};

/** Violations per day, stacked by type. */
export const DailyTrendChart = ({ data }: { data: DayStat[] }) => {
  if (data.length === 0) return <Empty>No dated events to plot.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
        <XAxis dataKey="date" tickFormatter={formatDay} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} minTickGap={16} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => String(l)} cursor={{ fill: 'var(--color-brand-blue)', fillOpacity: 0.06 }} />
        <Legend verticalAlign="top" align="right" height={28} iconType="square" iconSize={10} wrapperStyle={LEGEND_STYLE} />
        {KINDS.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            name={KIND_LABELS[k]}
            stackId="d"
            fill={KIND_COLORS[k]}
            radius={i === 2 ? [3, 3, 0, 0] : undefined}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

/** Violations by hour of day, stacked by type. */
export const HourlyChart = ({ data }: { data: HourStat[] }) => {
  if (data.every((h) => h.speed + h.nights + h.continuous === 0)) {
    return <Empty>No timed events to plot.</Empty>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
        <XAxis dataKey="hour" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} interval={2} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-brand-blue)', fillOpacity: 0.06 }} />
        <Legend verticalAlign="top" align="right" height={28} iconType="square" iconSize={10} wrapperStyle={LEGEND_STYLE} />
        {KINDS.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            name={KIND_LABELS[k]}
            stackId="h"
            fill={KIND_COLORS[k]}
            radius={i === 2 ? [3, 3, 0, 0] : undefined}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

/** How many events each rule filtered out or tagged. */
export const ReasonChart = ({
  data,
}: {
  data: { label: string; count: number }[];
}) => {
  if (data.length === 0) return <Empty>No event was affected by a rule.</Empty>;
  const rows = [...data].reverse();
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 44 + 40)}>
      <BarChart data={rows} layout="vertical" barCategoryGap={12} margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.08} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tick={{ fontSize: 11.5, fill: 'currentColor', opacity: 0.85 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-brand-blue)', fillOpacity: 0.06 }} />
        <Bar dataKey="count" name="Events" fill="#3E55A5" radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
};
