/**
 * Admin select primitive.
 */

import type { SelectHTMLAttributes } from 'react';
import type { AdminMenuOption } from '../types/admin.types';

interface AdminSelectProps<T extends string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'onChange'> {
  label?: string;
  helper?: string;
  error?: string;
  options: AdminMenuOption<T>[];
  onChange?: (value: T) => void;
}

export function AdminSelect<T extends string>({
  label,
  helper,
  error,
  options,
  onChange,
  id,
  value,
  ...props
}: AdminSelectProps<T>) {
  const inputId =
    id ?? (label ? `admin-select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <label
      htmlFor={inputId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontSize: 12,
        color: '#9AA0AA',
      }}
    >
      {label ? (
        <span style={{ fontWeight: 600, color: '#EFF1F5' }}>{label}</span>
      ) : null}
      <select
        id={inputId}
        value={value}
        onChange={(event) => onChange?.(event.target.value as T)}
        {...props}
        style={{
          padding: '10px 12px',
          background: '#0F1116',
          border: `1px solid ${error ? '#FF3D77' : '#262A34'}`,
          borderRadius: 8,
          color: '#EFF1F5',
          fontSize: 13,
        }}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span style={{ color: '#FF3D77', fontSize: 11 }}>{error}</span>
      ) : helper ? (
        <span style={{ color: '#7B7F8A', fontSize: 11 }}>{helper}</span>
      ) : null}
    </label>
  );
}
