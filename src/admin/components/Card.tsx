/**
 * Admin card container.
 */

import type { ReactNode } from 'react';

interface AdminCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  padding?: number | string;
  variant?: 'default' | 'muted';
}

export function AdminCard({
  title,
  subtitle,
  actions,
  children,
  footer,
  padding = 20,
  variant = 'default',
}: AdminCardProps) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: variant === 'muted' ? '#0F1116' : '#181B22',
        border: '1px solid #262A34',
        borderRadius: 12,
      }}
    >
      {(title || actions) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding,
            borderBottom: '1px solid #262A34',
            gap: 12,
          }}
        >
          <div>
            {title ? (
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#EFF1F5',
                }}
              >
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p
                style={{
                  margin: '4px 0 0',
                  color: '#9AA0AA',
                  fontSize: 12,
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div style={{ display: 'flex', gap: 8 }}>{actions}</div> : null}
        </header>
      )}
      <div style={{ padding, color: '#EFF1F5', flex: 1 }}>{children}</div>
      {footer ? (
        <footer
          style={{
            padding,
            borderTop: '1px solid #262A34',
            color: '#9AA0AA',
            fontSize: 12,
          }}
        >
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
