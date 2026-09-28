/**
 * Heatmap
 *
 * Renders the activity heatmap (day-of-week × hour-of-day) using a grid.
 */

import type { AdminStatsHeatmapCell } from '../types/stats.types';

interface HeatmapProps {
  cells: AdminStatsHeatmapCell[];
  color?: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Heatmap({ cells, color = '#4B4EFF' }: HeatmapProps) {
  const max = Math.max(1, ...cells.map((cell) => cell.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '30px repeat(24, 1fr)', gap: 2 }}>
        <div />
        {Array.from({ length: 24 }).map((_, hour) => (
          <div
            key={hour}
            style={{ fontSize: 10, color: '#7B7F8A', textAlign: 'center' }}
          >
            {hour}
          </div>
        ))}
        {DAY_LABELS.map((label, day) => (
          <FragmentRow key={label} label={label} day={day} cells={cells} color={color} max={max} />
        ))}
      </div>
    </div>
  );
}

interface FragmentRowProps {
  label: string;
  day: number;
  cells: AdminStatsHeatmapCell[];
  color: string;
  max: number;
}

function FragmentRow({ label, day, cells, color, max }: FragmentRowProps) {
  return (
    <>
      <div style={{ fontSize: 10, color: '#7B7F8A' }}>{label}</div>
      {Array.from({ length: 24 }).map((_, hour) => {
        const cell = cells.find((entry) => entry.day === day && entry.hour === hour);
        const intensity = cell ? cell.value / max : 0;
        return (
          <div
            key={`${day}-${hour}`}
            title={cell ? `${label} ${hour}:00 · ${cell.value}` : undefined}
            style={{
              height: 14,
              borderRadius: 3,
              background: intensity
                ? `rgba(75, 78, 255, ${0.15 + intensity * 0.7})`
                : '#1E2129',
              border: '1px solid #1A1D25',
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              // color kept for future outlines
            }}
            data-color={color}
          />
        );
      })}
    </>
  );
}
