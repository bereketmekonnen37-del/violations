/**
 * Breadcrumbs
 *
 * Renders a series of links leading to the current page. Uses plain
 * anchors so the admin surface has no dependency on the main router.
 */

import type { AdminBreadcrumb } from '../types/admin.types';

interface BreadcrumbsProps {
  items: AdminBreadcrumb[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#7B7F8A', fontSize: 12 }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} style={{ display: 'inline-flex', gap: 6 }}>
            {item.href && !isLast ? (
              <a
                href={item.href}
                style={{ color: '#9AA0AA', textDecoration: 'none' }}
              >
                {item.label}
              </a>
            ) : (
              <span style={{ color: isLast ? '#EFF1F5' : '#9AA0AA' }}>{item.label}</span>
            )}
            {!isLast ? <span>›</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
