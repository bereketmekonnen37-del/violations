interface Props {
  size?: number;
  withText?: boolean;
  className?: string;
}

export const Logo = ({ size = 44, withText = true, className = '' }: Props) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.png"
        alt="Fleetwatch"
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl  bg-black border-full object-contain"
      />
      {withText && (
        <span className="text-[15px] font-semibold tracking-tight">
          Ola<span className="text-ink-500 dark:text-ink-400">Fleet</span>
        </span>
      )}
    </div>
  );
};
