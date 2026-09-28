/**
 * Stat card.
 *
 * A large-value card used across the dashboard summary.
 */

import { formatInteger } from '../utils/format';
import type { AdminStatsCardModel } from '../types/stats.types';

interface StatCardProps {
  model: AdminStatsCardModel;
  loading?: boolean;
}

function accentColor(accent: AdminStatsCardModel['accent']): string {
  switch (accent) {
    case 'positive':
      return '#39C15A';
    case 'negative':
      return '#FF3D77';
    case 'warning':
      return '#FFB020';
    default:
      return '#4B4EFF';
  }
}

export function StatCard({ model, loading = false }: StatCardProps) {
  const numeric = typeof model.value === 'number';
  const formatted = numeric ? formatInteger(model.value as number) : String(model.value);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 20,
        background: '#181B22',
        border: '1px solid #262A34',
        borderRadius: 12,
        minHeight: 120,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#9AA0AA',
          fontSize: 12,
        }}
      >
        <span>{model.label}</span>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: accentColor(model.accent),
          }}
        />
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: loading ? '#7B7F8A' : '#EFF1F5',
        }}
      >
        {loading ? '…' : formatted}
      </div>
      {model.hint ? (
        <div style={{ color: '#7B7F8A', fontSize: 11 }}>{model.hint}</div>
      ) : null}
    </div>
  );
}
