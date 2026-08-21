interface Props {
  size?: number;
  withText?: boolean;
  className?: string;
  /**
   * Where the logo is being rendered:
   *  - `light`    → on the default light page surface (small dark blue text on a white chip)
   *  - `primary`  → on a dark image or panel where we want a strong solid primary chip
   *  - `gradient` → on top of the primary blue sidebar gradient (glass chip so the wash shows through)
   */
  variant?: 'light' | 'primary' | 'gradient';
}

export const Logo = ({
  size = 44,
  withText = true,
  className = '',
  variant = 'light',
}: Props) => {
  const isLight = variant === 'light';

  const imageStyle =
    variant === 'primary'
      ? {
          background: 'var(--color-brand-blue)',
          border: '1px solid rgba(255, 255, 255, 0.45)',
          boxShadow:
            '0 8px 24px rgba(31, 43, 87, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
        }
      : variant === 'gradient'
        ? {
            background: 'rgba(255, 255, 255, 0.16)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 6px 20px rgba(15, 20, 40, 0.28)',
          }
        : {
            background: '#ffffff',
            border: '1px solid var(--color-brand-blue-line)',
          };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/logo.png"
        alt="Fleetwatch"
        style={{ width: size, height: size, ...imageStyle }}
        className="shrink-0 rounded-xl object-contain backdrop-blur-sm"
      />
      {withText && (
        <span
          className="text-[19px] font-extrabold tracking-tight leading-none"
          style={{
            letterSpacing: '-0.01em',
          }}
        >
          <span
            style={{
              color: isLight ? 'var(--color-brand-blue-dark)' : '#ffffff',
              textShadow: isLight
                ? undefined
                : '0 1px 3px rgba(15, 20, 40, 0.35)',
            }}
          >
            Ola
          </span>
          <span style={{ color: 'var(--color-brand-accent)' }}>Fleet</span>
        </span>
      )}
    </div>
  );
};
