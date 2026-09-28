/**
 * KeyValueList
 *
 * Two-column definition list used on the user details and settings pages.
 */

import type { ReactNode } from 'react';

interface Item {
  label: string;
  value: ReactNode;
}

interface KeyValueListProps {
  items: Item[];
  columns?: 1 | 2;
}

export function KeyValueList({ items, columns = 2 }: KeyValueListProps) {
  return (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: columns === 2 ? '1fr 1fr' : '1fr',
        rowGap: 8,
        columnGap: 24,
        margin: 0,
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', flexDirection: 'column' }}>
          <dt style={{ color: '#7B7F8A', fontSize: 11 }}>{item.label}</dt>
          <dd style={{ margin: 0, color: '#EFF1F5', fontSize: 13 }}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
