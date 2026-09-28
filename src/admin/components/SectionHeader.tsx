/**
 * SectionHeader
 *
 * Consistent header row used above sections inside pages.
 */

import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 15, color: '#EFF1F5' }}>{title}</h2>
        {description ? (
          <p style={{ margin: '4px 0 0', color: '#9AA0AA', fontSize: 12 }}>{description}</p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 8 }}>{actions}</div> : null}
    </div>
  );
}
