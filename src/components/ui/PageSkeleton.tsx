import { PageHeader } from '../layout/PageHeader';

interface PageSkeletonProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Stat tiles above the main block. Default 4. */
  statCount?: number;
  /** Render top-offender podium cards (Master Fleet). */
  withPodium?: boolean;
  /** Render the Speed/Nights/Continuous tabs panel. */
  withTabs?: boolean;
}

const shimmer = 'animate-pulse bg-ink-100 dark:bg-ink-800';

const Line = ({ className = '' }: { className?: string }) => (
  <span className={`inline-block h-3 rounded ${shimmer} ${className}`} />
);

const Block = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-xl ${shimmer} ${className}`} />
);

const StatTile = () => (
  <div className="surface rounded-2xl p-5 shadow-card">
    <div className="flex items-start justify-between">
      <div className="min-w-0 space-y-2">
        <Line className="w-20" />
        <Line className="h-7 w-24" />
      </div>
      <Block className="h-11 w-11" />
    </div>
  </div>
);

const PodiumCard = () => (
  <div className="surface rounded-2xl p-5 shadow-card">
    <div className="flex items-start justify-between">
      <div className="min-w-0 space-y-2">
        <Line className="w-24" />
        <Line className="h-5 w-40" />
        <Line className="w-28" />
      </div>
      <Block className="h-11 w-11" />
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2">
      <Block className="h-14" />
      <Block className="h-14" />
      <Block className="h-14" />
    </div>
    <Block className="mt-4 h-10" />
  </div>
);

const TabsPanel = () => (
  <div className="surface mt-8 rounded-2xl p-5 sm:p-7">
    <div className="flex items-end justify-between">
      <div className="space-y-2">
        <Line className="h-4 w-56" />
        <Line className="w-72" />
      </div>
      <Block className="h-8 w-56" />
    </div>
    <Block className="mt-4 h-10 w-full" />
    <div className="mt-4 flex gap-2">
      <Block className="h-9 w-24" />
      <Block className="h-9 w-24" />
      <Block className="h-9 w-28" />
    </div>
    <div className="mt-4 overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-ink-100 px-4 py-3 last:border-b-0 dark:border-ink-800"
        >
          <Line className="w-20" />
          <Line className="flex-1" />
          <Line className="w-24" />
          <Line className="w-20" />
          <Line className="w-28" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Full-page loading skeleton. Mirrors the real page's layout so content
 * doesn't jump when the data finishes loading.
 */
export const PageSkeleton = ({
  eyebrow,
  title,
  subtitle,
  statCount = 4,
  withPodium = false,
  withTabs = false,
}: PageSkeletonProps) => {
  return (
    <div className="mx-auto w-full max-w-7xl" aria-busy="true" aria-live="polite">
      <PageHeader eyebrow={eyebrow} title={title ?? 'Loading…'} subtitle={subtitle} />

      {statCount > 0 && (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          role="presentation"
        >
          {Array.from({ length: statCount }).map((_, i) => (
            <StatTile key={i} />
          ))}
        </div>
      )}

      {withPodium && (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PodiumCard />
          <PodiumCard />
          <PodiumCard />
        </div>
      )}

      {withTabs ? (
        <TabsPanel />
      ) : (
        <Block className="mt-8 h-72 w-full" />
      )}

      <span className="sr-only">Loading data…</span>
    </div>
  );
};
