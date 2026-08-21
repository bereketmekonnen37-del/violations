import { useMemo, useState } from 'react';
import type { DailyBucket } from '../../lib/dashboardAnalytics';

interface Props {
  data: DailyBucket[];
  /** Height in pixels. Width fills the container. */
  height?: number;
}

type Kind = 'speed' | 'nights' | 'continuous';

const KIND_META: Record<Kind, { label: string; color: string; softColor: string }> = {
  speed: {
    label: 'Speed',
    color: '#F48221', // brand accent orange
    softColor: '#FDE3CE',
  },
  nights: {
    label: 'Nights',
    color: '#3E55A5', // brand blue
    softColor: '#EEF1FA',
  },
  continuous: {
    label: 'Continuous',
    color: '#6B7FC4', // brand blue-light for a related-but-distinct hue
    softColor: '#DFE4F2',
  },
};

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
  });
};

export const DailyViolationsChart = ({ data, height = 280 }: Props) => {
  const VIEW_W = 1000; // svg viewBox width — scales to container
  const PAD_L = 44;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 40;
  const innerH = height - PAD_T - PAD_B;
  const innerW = VIEW_W - PAD_L - PAD_R;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxVal = useMemo(() => {
    let m = 0;
    data.forEach((d) => {
      m = Math.max(m, d.speed, d.nights, d.continuous);
    });
    // Round up to a "nice" number so gridlines aren't ugly.
    if (m === 0) return 1;
    if (m <= 5) return 5;
    if (m <= 10) return 10;
    const step = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / step) * step;
  }, [data]);

  const gridLines = useMemo(() => {
    const lines: number[] = [];
    const stepCount = 4;
    for (let i = 0; i <= stepCount; i++) {
      lines.push(Math.round((maxVal / stepCount) * i));
    }
    return lines;
  }, [maxVal]);

  const groupWidth = data.length > 0 ? innerW / data.length : innerW;
  const barGroupWidth = Math.max(6, Math.min(groupWidth * 0.7, 42));
  const barWidth = barGroupWidth / 3;

  const yFor = (v: number): number => PAD_T + innerH - (v / maxVal) * innerH;
  const xForGroup = (i: number): number => PAD_L + i * groupWidth + groupWidth / 2;

  const isAllZero = useMemo(
    () => data.every((d) => d.speed === 0 && d.nights === 0 && d.continuous === 0),
    [data],
  );

  return (
    <div className="relative w-full">
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        {(Object.keys(KIND_META) as Kind[]).map((k) => (
          <span
            key={k}
            className="inline-flex items-center gap-1.5 font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: KIND_META[k].color }}
            />
            {KIND_META[k].label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${height}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height }}
        role="img"
        aria-label="Daily violation counts across speed, nights and continuous"
      >
        <defs>
          {(Object.keys(KIND_META) as Kind[]).map((k) => (
            <linearGradient
              id={`grad-${k}`}
              key={k}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor={KIND_META[k].color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={KIND_META[k].color} stopOpacity="0.6" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines + Y ticks */}
        {gridLines.map((v) => {
          const y = yFor(v);
          return (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={VIEW_W - PAD_R}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={PAD_L - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                opacity={0.55}
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Hover column highlight */}
        {hoverIdx !== null && data[hoverIdx] && (
          <rect
            x={PAD_L + hoverIdx * groupWidth}
            y={PAD_T}
            width={groupWidth}
            height={innerH}
            fill="currentColor"
            fillOpacity={0.05}
            rx={6}
          />
        )}

        {/* Bars */}
        {data.map((d, i) => {
          const cx = xForGroup(i);
          const startX = cx - barGroupWidth / 2;
          const bars: Array<{ kind: Kind; value: number }> = [
            { kind: 'speed', value: d.speed },
            { kind: 'nights', value: d.nights },
            { kind: 'continuous', value: d.continuous },
          ];
          return (
            <g
              key={d.date}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {/* Invisible hit target so hover works even on zero-value days */}
              <rect
                x={PAD_L + i * groupWidth}
                y={PAD_T}
                width={groupWidth}
                height={innerH}
                fill="transparent"
              />
              {bars.map((b, j) => {
                const h = b.value === 0 ? 0 : Math.max(2, ((height - PAD_T - PAD_B) * b.value) / maxVal);
                const y = PAD_T + innerH - h;
                return (
                  <rect
                    key={b.kind}
                    x={startX + j * barWidth}
                    y={y}
                    width={barWidth - 1.5}
                    height={h}
                    rx={2}
                    fill={`url(#grad-${b.kind})`}
                    style={{ transition: 'y 200ms, height 200ms' }}
                  />
                );
              })}
            </g>
          );
        })}

        {/* X-axis labels — draw a subset when many days */}
        {data.map((d, i) => {
          const showEvery = Math.max(1, Math.round(data.length / 7));
          if (i % showEvery !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={`x-${d.date}`}
              x={xForGroup(i)}
              y={height - 14}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
              opacity={0.65}
            >
              {dayLabel(d.date)}
            </text>
          );
        })}

        {/* Baseline */}
        <line
          x1={PAD_L}
          x2={VIEW_W - PAD_R}
          y1={PAD_T + innerH}
          y2={PAD_T + innerH}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && data[hoverIdx] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl p-3 text-xs shadow-elev"
          style={{
            left: `${((PAD_L + hoverIdx * groupWidth + groupWidth / 2) / VIEW_W) * 100}%`,
            top: 6,
            background: '#ffffff',
            border: '1px solid var(--color-brand-blue-line)',
          }}
        >
          <p
            className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-brand-blue)' }}
          >
            {dayLabelLong(data[hoverIdx].date)}
          </p>
          {(Object.keys(KIND_META) as Kind[]).map((k) => (
            <div
              key={k}
              className="flex items-center justify-between gap-6 py-0.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={{ background: KIND_META[k].color }}
                />
                {KIND_META[k].label}
              </span>
              <span className="font-mono font-semibold">
                {data[hoverIdx][k]}
              </span>
            </div>
          ))}
        </div>
      )}

      {isAllZero && (
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          No violations recorded in this window yet.
        </div>
      )}
    </div>
  );
};
