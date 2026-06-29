import { initials } from '../../lib/utils';

interface Props {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

export const Avatar = ({ name, src, size = 36, className = '' }: Props) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-ink-900 text-[12px] font-semibold uppercase text-white dark:bg-white dark:text-ink-900 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name) || '?'}
    </div>
  );
};
