import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Crown,
  Download,
  FolderArchive,
  Funnel,
  Gauge,
  Layers,
  Loader2,
  Moon,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  ShieldOff,
  Truck,
  Users,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { KindIcon, RuleReasonBadge } from '../components/ui/RuleReasonBadge';
import { reasonRowClass } from '../components/ui/ruleReasonStyles';
import { StatCard } from '../components/ui/StatCard';
import {
  DailyTrendChart,
  HourlyChart,
  ReasonChart,
  StackedRankChart,
  TypeDonut,
} from '../features/snapshots/SnapshotCharts';
import { fetchSnapshot } from '../features/snapshots/snapshotsApi';
import {
  type FilteredContinuousEvent,
  type FilteredNightEvent,
  downloadFilteredContinuousCsv,
  downloadFilteredNightsCsv,
  downloadFilteredSpeedCsv,
  downloadMasterFleetCsv,
} from '../lib/masterFleet';
import {
  downloadRuleFilteredCsv,
  KIND_LABEL,
} from '../lib/ruleFiltered';
import {
  computeSnapshotAnalytics,
  transporterLabel,
  type SnapshotData,
  type SnapshotMeta,
} from '../lib/snapshots';
import { formatDateTime } from '../lib/utils';

type TabKey = 'ranking' | 'speed' | 'nights' | 'continuous' | 'filtered';

const PAGE_SIZE = 200;

const TAB_META: Record<TabKey, { label: string; icon: typeof Gauge }> = {
  ranking: { label: 'Ranking', icon: Layers },
  speed: { label: 'Speed', icon: Gauge },
  nights: { label: 'Nights', icon: Moon },
  continuous: { label: 'Continuous', icon: RouteIcon },
  filtered: { label: 'Filtered', icon: Funnel },
};

const Card = ({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`surface rounded-2xl p-5 sm:p-6 ${className}`}>
    <h2 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h2>
    {subtitle && (
      <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{subtitle}</p>
    )}
    <div className="mt-4">{children}</div>
  </section>
);

const RED_ROW = 'bg-red-50/60 dark:bg-red-950/20';
const AMBER_ROW = 'bg-amber-50/70 dark:bg-amber-950/20';
const PLAIN_ROW = 'bg-white dark:bg-ink-950';

interface Column<T> {
  header: string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  align?: 'right';
}

/** Searchable, paged table used by every data tab. */
function DataTable<T>({
  rows,
  columns,
  rowKey,
  rowClass,
  matches,
  emptyText,
  toolbar,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowClass?: (row: T) => string;
  matches: (row: T, needle: string) => boolean;
  emptyText: string;
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => matches(r, q)) : rows;
  }, [rows, query, matches]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Showing {Math.min(shown, filtered.length).toLocaleString()} of{' '}
          {filtered.length.toLocaleString()}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <div className="relative sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE_SIZE);
              }}
              placeholder="Search VID, driver, location…"
              className="input-base !pl-9"
            />
          </div>
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:bg-ink-900 dark:text-ink-400">
              <tr>
                {columns.map((c) => (
                  <th key={c.header} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-ink-500 dark:text-ink-400">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                filtered.slice(0, shown).map((r, i) => (
                  <tr key={rowKey(r)} className={rowClass?.(r) ?? PLAIN_ROW}>
                    {columns.map((c) => (
                      <td
                        key={c.header}
                        className={`px-4 py-2.5 text-ink-800 dark:text-ink-100 ${
                          c.align === 'right' ? 'text-right' : ''
                        } ${c.className ?? ''}`}
                      >
                        {c.cell(r, i)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length > shown && (
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE_SIZE)} className="btn-secondary">
            Show {Math.min(PAGE_SIZE, filtered.length - shown).toLocaleString()} more
          </button>
        </div>
      )}
    </div>
  );
}

type NightOrContinuous = FilteredNightEvent | FilteredContinuousEvent;
const isUnder = (r: NightOrContinuous): boolean =>
  'underestimated' in r && r.underestimated === true;

const dash = <span className="text-ink-400">—</span>;
const mono = 'font-mono text-xs text-ink-700 dark:text-ink-200';
const has = (v: string | undefined, needle: string) => (v ?? '').toLowerCase().includes(needle);

export const SnapshotDetailPage = () => {
  const { snapshotId } = useParams<{ snapshotId: string }>();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; meta: SnapshotMeta; data: SnapshotData }
  >({ status: 'loading' });
  const [tab, setTab] = useState<TabKey>('ranking');

  useEffect(() => {
    if (!snapshotId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });
    fetchSnapshot(snapshotId)
      .then(({ meta, data }) => {
        if (!cancelled) setState({ status: 'ready', meta, data });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Could not open this saved copy.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [snapshotId]);

  const data = state.status === 'ready' ? state.data : null;
  const analytics = useMemo(() => (data ? computeSnapshotAnalytics(data) : null), [data]);

  const back = (
    <Link
      to="/snapshots"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
    >
      <ArrowLeft size={15} /> All saved violations
    </Link>
  );

  if (state.status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-7xl">
        {back}
        <EmptyState icon={Loader2} title="Opening saved violations…" description="Unpacking the saved data." />
      </div>
    );
  }
  if (state.status === 'error' || !data || !analytics) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        {back}
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {state.status === 'error' ? state.message : 'Could not open this saved copy.'}
        </div>
      </div>
    );
  }

  const { meta } = state;
  const { totals, transporters } = analytics;
  const worst = transporters[0];
  const filteredTotal = data.ruleFiltered.length;

  const filteredReasonFilter = (r: (typeof data.ruleFiltered)[number], q: string) =>
    has(r.vid, q) ||
    has(r.driverName, q) ||
    has(r.transporter, q) ||
    has(r.from, q) ||
    has(r.positionA, q) ||
    has(r.positionB, q) ||
    r.reasonDetails.some((d) => has(d, q));

  const counts: Record<TabKey, number> = {
    ranking: data.rows.length,
    speed: data.events.speed.length,
    nights: data.events.nights.length,
    continuous: data.events.continuous.length,
    filtered: filteredTotal,
  };

  const downloadTab = () => {
    if (tab === 'ranking') downloadMasterFleetCsv(data.rows, {}, `fleetwatch-snapshot-ranking.csv`);
    else if (tab === 'speed') downloadFilteredSpeedCsv(data.events.speed);
    else if (tab === 'nights') downloadFilteredNightsCsv(data.events.nights);
    else if (tab === 'continuous') downloadFilteredContinuousCsv(data.events.continuous);
    else downloadRuleFilteredCsv(data.ruleFiltered);
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      {back}
      <PageHeader
        eyebrow="Saved violations"
        title={meta.name}
        subtitle={`Saved ${formatDateTime(meta.createdAt)}${
          meta.createdByName ? ` by ${meta.createdByName}` : ''
        }. Everything below is frozen at that moment.`}
        actions={
          <button type="button" onClick={downloadTab} disabled={counts[tab] === 0} className="btn-primary">
            <Download size={16} /> Download {TAB_META[tab].label} CSV
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Drivers ranked" value={data.rows.length.toLocaleString()} icon={Users} />
        <StatCard label="Violations" value={totals.total.toLocaleString()} icon={Layers} accent />
        <StatCard label="Speed" value={totals.speed.toLocaleString()} icon={Gauge} />
        <StatCard label="Nights" value={totals.nights.toLocaleString()} icon={Moon} />
        <StatCard label="Continuous" value={totals.continuous.toLocaleString()} icon={RouteIcon} />
        <StatCard label="Transporters" value={transporters.length.toLocaleString()} icon={Truck} />
      </div>

      {/* Worst transporter callout */}
      {worst && worst.total > 0 && (
        <div className="surface mt-6 flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-orange-soft text-brand-orange-dark ring-1 ring-brand-orange-line">
              <Crown size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                Highest violated transporter
              </p>
              <h2 className="truncate font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-white" title={worst.name}>
                {worst.name}
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center sm:min-w-[380px]">
            {(
              [
                ['Total', worst.total],
                ['Speed', worst.speed],
                ['Nights', worst.nights],
                ['Cont.', worst.continuous],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="surface-2 rounded-xl p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{label}</p>
                <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-500 dark:text-ink-400 sm:max-w-[160px]">
            {(analytics.topTransporterShare * 100).toFixed(1)}% of all violations across{' '}
            {worst.vids} VID{worst.vids === 1 ? '' : 's'}.
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Most violated transporters" subtitle="Top 10 by total violations, split by type.">
          <StackedRankChart
            rows={transporters.filter((t) => t.total > 0).slice(0, 10)}
            emptyText="No transporter violations in this saved copy."
          />
        </Card>
        <Card title="Violations by type" subtitle="Share of all counted violations.">
          <TypeDonut totals={totals} />
        </Card>
        <Card title="Violations over time" subtitle="Counted events per day, by type." className="xl:col-span-2">
          <DailyTrendChart data={analytics.daily} />
        </Card>
        <Card title="Repeat offenders" subtitle="Top 10 VIDs by total violations.">
          <StackedRankChart
            rows={analytics.topVids.map((r) => ({
              name: `${r.vid} · ${r.driverName}`,
              speed: r.speed,
              nights: r.nights,
              continuous: r.continuous,
              total: r.total,
            }))}
            emptyText="No VID violations in this saved copy."
            labelWidth={190}
          />
        </Card>
        <Card title="Time of day" subtitle="When counted events started.">
          <HourlyChart data={analytics.hourly} />
        </Card>
        <Card
          title="Events affected by rules"
          subtitle={`${filteredTotal.toLocaleString()} events filtered out or tagged by a rule.`}
          className="xl:col-span-2"
        >
          <ReasonChart data={analytics.filteredByReason} />
        </Card>
      </div>

      {/* Rules */}
      <Card
        className="mt-6"
        title="Rules in this saved copy"
        subtitle="The rules that were active when it was saved. Struck-through rules were removed for this saved copy."
      >
        <ul className="grid gap-2 md:grid-cols-2">
          {data.ruleItems.map((item) => (
            <li
              key={item.id}
              className={
                'flex items-start gap-2.5 rounded-xl border p-3 ' +
                (item.applied
                  ? 'border-brand-blue-line bg-white dark:bg-ink-900'
                  : 'border-dashed border-ink-200 bg-ink-50 opacity-70 dark:border-ink-700 dark:bg-ink-950')
              }
            >
              {item.applied ? (
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <ShieldOff size={15} className="mt-0.5 shrink-0 text-ink-400" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-semibold text-ink-900 dark:text-white ${item.applied ? '' : 'line-through'}`}>
                  {item.label}
                  {!item.applied && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">removed</span>
                  )}
                </p>
                <p className="text-xs text-ink-500 dark:text-ink-400">{item.detail}</p>
                {item.chips.length > 0 && (
                  <div className="mt-1.5 flex max-h-16 flex-wrap gap-1 overflow-y-auto">
                    {item.chips.map((c, i) => (
                      <span key={`${c}-${i}`} className="rounded-full bg-ink-100 px-2 py-0.5 font-mono text-[10px] text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Transporter table */}
      <Card className="mt-6" title="All transporters" subtitle="Every transporter with at least one ranked VID, worst first.">
        <div className="overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
          <div className="max-h-[50vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:bg-ink-900 dark:text-ink-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Transporter</th>
                  <th className="px-4 py-3 text-right">VIDs</th>
                  <th className="px-4 py-3 text-right">Speed</th>
                  <th className="px-4 py-3 text-right">Nights</th>
                  <th className="px-4 py-3 text-right">Continuous</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {transporters.map((t, i) => (
                  <tr key={t.name} className={PLAIN_ROW}>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-ink-900 dark:text-white">{t.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{t.vids}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{t.speed}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{t.nights}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{t.continuous}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-ink-900 dark:text-white">{t.total}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink-500">
                      {totals.total > 0 ? `${((t.total / totals.total) * 100).toFixed(1)}%` : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Data tabs */}
      <Card
        className="mt-6"
        title="Saved data"
        subtitle="The exact Master Fleet tabs as they were when this saved copy was saved."
      >
        <div className="mb-4 inline-flex flex-wrap rounded-xl border border-ink-100 bg-ink-50 p-1 dark:border-ink-800 dark:bg-ink-900">
          {(Object.keys(TAB_META) as TabKey[]).map((t) => {
            const { label, icon: Icon } = TAB_META[t];
            const active = t === tab;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
                  (active
                    ? 'bg-white text-ink-900 shadow-card dark:bg-ink-950 dark:text-white'
                    : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white')
                }
              >
                <Icon size={13} /> {label}
                <span
                  className={
                    'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' +
                    (active ? 'bg-brand-blue text-white' : 'bg-brand-blue-soft text-brand-blue-dark')
                  }
                >
                  {counts[t].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {tab === 'ranking' && (
          <DataTable
            key="ranking"
            rows={data.rows}
            rowKey={(r) => r.vid}
            rowClass={(r) => (r.allowedVid ? RED_ROW : PLAIN_ROW)}
            matches={(r, q) => has(r.vid, q) || has(r.driverName, q) || has(r.transporter, q)}
            emptyText="No ranked drivers in this saved copy."
            columns={[
              { header: '#', cell: (_, i) => <span className="font-mono text-xs text-ink-500">{i + 1}</span> },
              { header: 'VID', cell: (r) => <span className="font-mono">{r.vid}</span> },
              { header: 'Driver', cell: (r) => r.driverName || dash },
              { header: 'Transporter', cell: (r) => transporterLabel(r.transporter) },
              { header: 'Nights', align: 'right', cell: (r) => <span className="font-mono">{r.nights}</span> },
              { header: 'Speed', align: 'right', cell: (r) => <span className="font-mono">{r.speed}</span> },
              { header: 'Continuous', align: 'right', cell: (r) => <span className="font-mono">{r.continuous}</span> },
              { header: 'Total', align: 'right', cell: (r) => <span className="font-mono font-semibold">{r.total}</span> },
            ]}
          />
        )}

        {tab === 'speed' && (
          <DataTable
            key="speed"
            rows={data.events.speed}
            rowKey={(r) => r.id}
            rowClass={(r) => (r.allowedVid || r.allowedLocation ? RED_ROW : PLAIN_ROW)}
            matches={(r, q) => has(r.vid, q) || has(r.driverName, q) || has(r.transporter, q) || has(r.overspeedPosition, q) || has(r.start, q)}
            emptyText="No speed events in this saved copy."
            columns={[
              { header: 'VID', cell: (r) => <span className="font-mono">{r.vid}</span> },
              { header: 'Driver', cell: (r) => r.driverName || dash },
              { header: 'Transporter', cell: (r) => r.transporter || dash },
              { header: 'Start', cell: (r) => <span className={mono}>{r.start}</span> },
              { header: 'End', cell: (r) => <span className={mono}>{r.end}</span> },
              { header: 'Duration', cell: (r) => <span className="font-mono">{r.duration}</span> },
              { header: 'Top speed', cell: (r) => r.topSpeed || dash },
              {
                header: 'Position',
                className: 'min-w-[220px] text-xs',
                cell: (r) => (
                  <div className="flex flex-col gap-1">
                    <span>{r.overspeedPosition || dash}</span>
                    {(r.allowedVid || r.allowedLocation) && (
                      <RuleReasonBadge reason={r.allowedVid ? 'allowed-vid' : 'allowed-location'} />
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}

        {(tab === 'nights' || tab === 'continuous') && (
          <DataTable<NightOrContinuous>
            key={tab}
            rows={tab === 'nights' ? data.events.nights : data.events.continuous}
            rowKey={(r) => r.id}
            rowClass={(r) =>
              r.allowedVid || r.allowedLocation
                ? RED_ROW
                : isUnder(r)
                  ? AMBER_ROW
                  : PLAIN_ROW
            }
            matches={(r, q) => has(r.vid, q) || has(r.driverName, q) || has(r.transporter, q) || has(r.positionA, q) || has(r.positionB, q) || has(r.timeA, q)}
            emptyText={`No ${tab} events in this saved copy.`}
            columns={[
              { header: 'VID', cell: (r) => <span className="font-mono">{r.vid}</span> },
              { header: 'Driver', cell: (r) => r.driverName || dash },
              { header: 'Transporter', cell: (r) => r.transporter || dash },
              { header: 'Time A', cell: (r) => <span className={mono}>{r.timeA}</span> },
              { header: 'Time B', cell: (r) => <span className={mono}>{r.timeB}</span> },
              { header: 'Duration', cell: (r) => <span className="font-mono">{r.duration}</span> },
              { header: 'Length', cell: (r) => r.length || dash },
              {
                header: 'Position',
                className: 'min-w-[220px] text-xs',
                cell: (r) => (
                  <div className="flex flex-col gap-1">
                    <span><b className="mr-1 font-mono text-ink-500">A</b>{r.positionA || dash}</span>
                    <span><b className="mr-1 font-mono text-ink-500">B</b>{r.positionB || dash}</span>
                    <div className="flex flex-wrap gap-1">
                      {r.allowedVid && <RuleReasonBadge reason="allowed-vid" />}
                      {r.allowedLocation && <RuleReasonBadge reason="allowed-location" />}
                      {isUnder(r) && <RuleReasonBadge reason="under-estimated" />}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        )}

        {tab === 'filtered' && (
          <DataTable
            key="filtered"
            rows={data.ruleFiltered}
            rowKey={(r) => `${r.kind}-${r.id}`}
            rowClass={reasonRowClass}
            matches={filteredReasonFilter}
            emptyText="No event was affected by a rule in this saved copy."
            columns={[
              {
                header: 'Type',
                cell: (r) => (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <KindIcon kind={r.kind} /> {KIND_LABEL[r.kind]}
                  </span>
                ),
              },
              { header: 'VID', cell: (r) => <span className="font-mono">{r.vid}</span> },
              { header: 'Driver', cell: (r) => r.driverName || dash },
              { header: 'Transporter', cell: (r) => r.transporter || dash },
              { header: 'Start / Time A', cell: (r) => <span className={mono}>{r.from}</span> },
              { header: 'Duration', cell: (r) => <span className="font-mono">{r.duration}</span> },
              { header: 'Speed / Length', cell: (r) => r.metric || dash },
              {
                header: 'Position',
                className: 'min-w-[200px] text-xs',
                cell: (r) => [r.positionA, r.positionB].filter(Boolean).join(' → ') || dash,
              },
              {
                header: 'Filtered by',
                className: 'min-w-[240px]',
                cell: (r) => (
                  <div className="flex flex-col gap-1">
                    {r.reasons.map((code, i) => (
                      <RuleReasonBadge key={code} reason={code} title={r.reasonDetails[i]} />
                    ))}
                    <span className="text-[11px] text-ink-500 dark:text-ink-400">
                      {r.reasonDetails.join(' · ')}
                    </span>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-ink-400">
        <FolderArchive size={12} /> Saved copies never change — press "Save current violations" on Master
        fleet to save a new one.
      </p>
    </div>
  );
};
