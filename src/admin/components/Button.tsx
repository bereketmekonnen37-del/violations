/**
 * Admin button primitive.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type AdminButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success';

export type AdminButtonSize = 'sm' | 'md' | 'lg';

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  block?: boolean;
}

function styleFor(variant: AdminButtonVariant, size: AdminButtonSize, block: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'transform 60ms ease, background-color 120ms ease, color 120ms ease',
    width: block ? '100%' : 'auto',
    fontFamily: 'inherit',
  };
  const sizeMap: Record<AdminButtonSize, React.CSSProperties> = {
    sm: { fontSize: 12, padding: '6px 10px' },
    md: { fontSize: 13, padding: '8px 14px' },
    lg: { fontSize: 14, padding: '11px 18px' },
  };
  const variantMap: Record<AdminButtonVariant, React.CSSProperties> = {
    primary: { background: '#4B4EFF', color: '#fff' },
    secondary: {
      background: '#181B22',
      color: '#EFF1F5',
      border: '1px solid #262A34',
    },
    ghost: { background: 'transparent', color: '#EFF1F5' },
    danger: { background: '#FF3D77', color: '#fff' },
    success: { background: '#39C15A', color: '#0F1116' },
  };
  return { ...base, ...sizeMap[size], ...variantMap[variant] };
}

export function AdminButton({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  block = false,
  disabled,
  style,
  children,
  ...props
}: AdminButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      style={{
        ...styleFor(variant, size, block),
        opacity: isDisabled ? 0.6 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {loading ? <span aria-hidden>…</span> : leftIcon}
      <span>{children}</span>
      {!loading ? rightIcon : null}
    </button>
  );
}
