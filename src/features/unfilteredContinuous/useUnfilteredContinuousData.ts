import { useMemo, useState } from 'react';
import { useAppSelector } from '../../app/store';
import { buildFuse, tokensMatch } from '../../lib/fuseSearch';
import {
  buildDriverProfileLookup,
  NOT_FOUND,
  type DriverProfileLookup,
} from '../../lib/driverLookup';
import type {
  ContinuousDriverBlock,
  ContinuousRow,
  ContinuousSource,
  UnfilteredContinuousFile,
} from '../../types';

export interface ContinuousFilters {
  driver: string;
  vid: string;
  dateFrom: string;
  dateTo: string;
  position: string;
  transporter: string;
}

const defaultFilters: ContinuousFilters = {
  driver: '',
  vid: '',
  dateFrom: '',
  dateTo: '',
  position: '',
  transporter: '',
};

export interface AggregatedContinuousDriver {
  blockId: string;
  driverName: string;
  vid: string;
  plate: string;
  period: string;
  transporter: string;
  matchedDriverName: string;
  source: ContinuousSource;
  rows: ContinuousRow[];
  fileTitle: string;
  fileId: string;
  uploadedBy: string;
}

const parseTime = (s: string): number | null => {
  if (!s) return null;
  const trimmed = s.trim();
  const d = new Date(trimmed.replace(' ', 'T'));
  if (!Number.isNaN(d.getTime())) return d.getTime();
  const d2 = new Date(trimmed);
  return Number.isNaN(d2.getTime()) ? null : d2.getTime();
};

const flatten = (
  files: UnfilteredContinuousFile[],
  resolveProfile: DriverProfileLookup,
): AggregatedContinuousDriver[] => {
  const out: AggregatedContinuousDriver[] = [];
  files.forEach((file) => {
    // `source` was added later — persisted pre-migration files won't have it.
    const fallback: ContinuousSource = file.source ?? 'mela';
    file.drivers.forEach((d: ContinuousDriverBlock) => {
      const profile = resolveProfile(d.vid);
      const transporter =
        profile.transporter || d.transporter || d.driverName || '';
      out.push({
        blockId: d.id,
        driverName: d.driverName,
        vid: d.vid,
        plate: d.plate ?? '',
        period: d.period,
        transporter,
        matchedDriverName: profile.driverName || NOT_FOUND,
        source: d.source ?? fallback,
        rows: d.rows,
        fileTitle: file.title,
        fileId: file.id,
        uploadedBy: file.uploaderName,
      });
    });
  });
  return out;
};

export const useUnfilteredContinuousData = (
  uploaderId?: string,
  fileId?: string,
) => {
  const allFiles = useAppSelector((s) => s.unfilteredContinuous.files);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const files = useMemo(
    () =>
      allFiles.filter(
        (f) =>
          (!uploaderId || f.uploaderId === uploaderId) && (!fileId || f.id === fileId),
      ),
    [allFiles, uploaderId, fileId],
  );

  const [filters, setFilters] = useState<ContinuousFilters>(defaultFilters);

  const resolveProfile = useMemo(
    () => buildDriverProfileLookup(driverRecords),
    [driverRecords],
  );

  const drivers = useMemo(() => flatten(files, resolveProfile), [files, resolveProfile]);

  const transporters = useMemo(() => {
    const set = new Set<string>();
    drivers.forEach((d) => d.transporter && set.add(d.transporter));
    return Array.from(set).sort();
  }, [drivers]);

  const driverFuse = useMemo(
    () => buildFuse(drivers, [{ name: 'driverName', weight: 1 }], 0.4),
    [drivers],
  );
  const transporterFuse = useMemo(
    () => buildFuse(drivers, [{ name: 'transporter', weight: 1 }], 0.4),
    [drivers],
  );

  const filtered = useMemo<AggregatedContinuousDriver[]>(() => {
    let base = drivers;

    if (filters.driver.trim()) {
      const ids = new Set(
        driverFuse.search(filters.driver.trim()).map((h) => h.item.blockId),
      );
      base = base.filter((d) => ids.has(d.blockId));
    }
    if (filters.vid.trim()) {
      const q = filters.vid.trim().toLowerCase();
      base = base.filter((d) => d.vid.toLowerCase().includes(q));
    }
    if (filters.transporter.trim()) {
      const ids = new Set(
        transporterFuse
          .search(filters.transporter.trim())
          .map((h) => h.item.blockId),
      );
      base = base.filter((d) => ids.has(d.blockId));
    }

    const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
    const to = filters.dateTo
      ? new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1
      : null;

    return base
      .map((d) => {
        let rows = d.rows;
        if (filters.position.trim()) {
          rows = rows.filter((r) =>
            tokensMatch(`${r.positionA} ${r.positionB}`, filters.position),
          );
        }
        if (from !== null || to !== null) {
          rows = rows.filter((r) => {
            const t = parseTime(r.timeA) ?? parseTime(r.timeB);
            if (t === null) return false;
            if (from !== null && t < from) return false;
            if (to !== null && t > to) return false;
            return true;
          });
        }
        return { ...d, rows };
      })
      .filter((d) => d.rows.length > 0)
      .sort((a, b) => b.rows.length - a.rows.length);
  }, [drivers, filters, driverFuse, transporterFuse]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.driver.trim()) n++;
    if (filters.vid.trim()) n++;
    if (filters.dateFrom) n++;
    if (filters.dateTo) n++;
    if (filters.position.trim()) n++;
    if (filters.transporter.trim()) n++;
    return n;
  }, [filters]);

  const totalRows = useMemo(
    () => drivers.reduce((s, d) => s + d.rows.length, 0),
    [drivers],
  );
  const matchedRows = useMemo(
    () => filtered.reduce((s, d) => s + d.rows.length, 0),
    [filtered],
  );

  return {
    files,
    drivers,
    filtered,
    filters,
    setFilters,
    reset: () => setFilters(defaultFilters),
    transporters,
    activeCount,
    totalRows,
    matchedRows,
  };
};
