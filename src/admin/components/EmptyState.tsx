/**
 * EmptyState
 *
 * Shown by tables/lists when there is nothing to render.
 */

import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 40,
        color: '#9AA0AA',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          border: '2px dashed #262A34',
        }}
      />
      <h3 style={{ margin: 0, fontSize: 14, color: '#EFF1F5' }}>{title}</h3>
      {description ? (
        <p style={{ margin: 0, fontSize: 12, textAlign: 'center', maxWidth: 360 }}>
          {description}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}
