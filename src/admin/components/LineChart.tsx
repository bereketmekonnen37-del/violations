/**
 * LineChart
 *
 * A pure-SVG line chart driven by a single series.
 */

import type { AdminStatsSeries } from '../types/stats.types';

interface LineChartProps {
  series: AdminStatsSeries;
  height?: number;
  width?: number | string;
}

export function LineChart({ series, height = 220, width = '100%' }: LineChartProps) {
  const values = series.points.map((point) => point.value);
  const max = Math.max(1, ...values);
  const count = Math.max(1, series.points.length - 1);
  const points = series.points
    .map((point, index) => {
      const x = (index / count) * 100;
      const y = 40 - (point.value / max) * 40;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div style={{ width }}>
      <div style={{ color: '#9AA0AA', fontSize: 12, marginBottom: 6 }}>
        {series.title}
      </div>
      <svg
        viewBox="0 0 100 40"
        width="100%"
        height={height}
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke={series.color}
          strokeWidth="1.2"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
        <polygon
          fill={series.color}
          opacity={0.14}
          points={`0,40 ${points} 100,40`}
        />
      </svg>
    </div>
  );
}
