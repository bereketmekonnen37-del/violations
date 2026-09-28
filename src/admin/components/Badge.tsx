/**
 * Admin badge primitive.
 */

import type { ReactNode } from 'react';

interface AdminBadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  outlined?: boolean;
}

const TONE_MAP: Record<Required<AdminBadgeProps>['tone'], { bg: string; fg: string }> = {
  neutral: { bg: '#181B22', fg: '#EFF1F5' },
  info: { bg: '#1E2A55', fg: '#8FB1FF' },
  success: { bg: '#0E3B22', fg: '#8FE1A3' },
  warning: { bg: '#3B2C0E', fg: '#FFD79A' },
  danger: { bg: '#3B0E23', fg: '#FF9AB4' },
};

export function AdminBadge({
  children,
  tone = 'neutral',
  size = 'sm',
  outlined = false,
}: AdminBadgeProps) {
  const palette = TONE_MAP[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: 999,
        fontSize: size === 'sm' ? 11 : 12,
        fontWeight: 600,
        background: outlined ? 'transparent' : palette.bg,
        border: outlined ? `1px solid ${palette.fg}` : `1px solid ${palette.bg}`,
        color: palette.fg,
      }}
    >
      {children}
    </span>
  );
}
