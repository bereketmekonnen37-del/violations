/**
 * Loader
 *
 * Tiny spinner used for pending states.
 */

interface LoaderProps {
  size?: number;
  label?: string;
}

export function Loader({ size = 20, label }: LoaderProps) {
  return (
    <div
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: '#9AA0AA',
        fontSize: 12,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          border: '2px solid #262A34',
          borderTopColor: '#4B4EFF',
          animation: 'admin-spin 900ms linear infinite',
        }}
      />
      {label ? <span>{label}</span> : null}
      <style>{`@keyframes admin-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
