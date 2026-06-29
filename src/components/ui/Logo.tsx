interface Props {
  size?: number;
  withText?: boolean;
  className?: string;
}

export const Logo = ({ size = 28, withText = true, className = '' }: Props) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="inline-flex items-center justify-center rounded-xl bg-ink-900 text-white dark:bg-white dark:text-ink-900"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width={size * 0.6}
          height={size * 0.6}
        >
          <path d="M3 17h2v-6h-2" />
          <path d="M5 17h11v-9h-6l-2 3h-3" />
          <circle cx="8" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
          <path d="M16 12h4l1 3v3h-3" />
        </svg>
      </span>
      {withText && (
        <span className="text-[15px] font-semibold tracking-tight">
          Fleet<span className="text-ink-500 dark:text-ink-400">watch</span>
        </span>
      )}
    </div>
  );
};
