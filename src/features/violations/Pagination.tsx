import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

const buildPages = (current: number, total: number): (number | 'ellipsis')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current - 1, current, current + 1]);
  const pages = Array.from(set).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  pages.forEach((p, idx) => {
    if (idx > 0 && p - pages[idx - 1] > 1) result.push('ellipsis');
    result.push(p);
  });
  return result;
};

export const Pagination = ({ page, pageCount, onChange }: Props) => {
  if (pageCount <= 1) return null;
  const pages = buildPages(page, pageCount);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="btn-secondary !px-3"
      >
        <ChevronLeft size={15} /> Previous
      </button>
      <ul className="flex flex-wrap items-center gap-1">
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <li key={`e-${idx}`} className="px-2 text-sm text-ink-400">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                onClick={() => onChange(p)}
                className={cn(
                  'inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition',
                  p === page
                    ? 'border-brand-blue bg-brand-blue text-white shadow-blue-glow'
                    : 'border-brand-blue-line bg-white text-brand-blue-dark hover:bg-brand-blue-soft',
                )}
              >
                {p}
              </button>
            </li>
          ),
        )}
      </ul>
      <button
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        className="btn-secondary !px-3"
      >
        Next <ChevronRight size={15} />
      </button>
    </nav>
  );
};
