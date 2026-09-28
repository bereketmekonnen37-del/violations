/**
 * Admin input primitive.
 */

import type { InputHTMLAttributes, ReactNode } from 'react';

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
}

export function AdminInput({
  label,
  helper,
  error,
  leftAdornment,
  rightAdornment,
  style,
  id,
  ...props
}: AdminInputProps) {
  const inputId =
    id ?? (label ? `admin-input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: '#0F1116',
          border: `1px solid ${error ? '#FF3D77' : '#262A34'}`,
          borderRadius: 8,
          transition: 'border-color 120ms ease',
        }}
      >
        {leftAdornment}
        <input
          id={inputId}
          {...props}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#EFF1F5',
            fontSize: 13,
            ...style,
          }}
        />
        {rightAdornment}
      </div>
      {error ? (
        <span style={{ color: '#FF3D77', fontSize: 11 }}>{error}</span>
      ) : helper ? (
        <span style={{ color: '#7B7F8A', fontSize: 11 }}>{helper}</span>
      ) : null}
    </label>
  );
}
