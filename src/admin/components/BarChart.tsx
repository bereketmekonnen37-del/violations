/**
 * BarChart
 *
 * A pure-SVG bar chart. No dependencies — good enough for dashboard mocks.
 */

import type { AdminStatsSeries } from '../types/stats.types';

interface BarChartProps {
  series: AdminStatsSeries;
  height?: number;
  width?: number | string;
}

export function BarChart({ series, height = 220, width = '100%' }: BarChartProps) {
  const values = series.points.map((point) => point.value);
  const max = Math.max(1, ...values);
  const columnCount = Math.max(1, series.points.length);
  const columnWidth = 100 / columnCount;

  return (
    <div style={{ width }}>
      <div style={{ color: '#9AA0AA', fontSize: 12, marginBottom: 6 }}>
        {series.title}
      </div>
      <svg viewBox="0 0 100 40" width="100%" height={height} preserveAspectRatio="none">
        {series.points.map((point, index) => {
          const barHeight = (point.value / max) * 40;
          const x = index * columnWidth;
          return (
            <g key={point.date}>
              <rect
                x={x + columnWidth * 0.1}
                y={40 - barHeight}
                width={columnWidth * 0.8}
                height={barHeight}
                fill={series.color}
                opacity={0.85}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
