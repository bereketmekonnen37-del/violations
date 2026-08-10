import { useMemo, useState } from 'react';
import { useAppSelector } from '../../app/store';
import { useUserScope } from '../../hooks/useUserScope';
import { buildFuse, tokensMatch } from '../../lib/fuseSearch';
import {
  buildDriverProfileLookup,
  NOT_FOUND,
  type DriverProfileLookup,
} from '../../lib/driverLookup';
import type {
  NightDriverBlock,
  NightRow,
  UnfilteredNightFile,
} from '../../types';

export interface NightFilters {
  driver: string;
  vid: string;
  dateFrom: string;
  dateTo: string;
  position: string;
  transporter: string;
}

const defaultFilters: NightFilters = {
  driver: '',
  vid: '',
  dateFrom: '',
  dateTo: '',
  position: '',
  transporter: '',
};

export interface AggregatedNightDriver {
  blockId: string;
  driverName: string;
  vid: string;
  period: string;
  transporter: string;
  matchedDriverName: string;
  rows: NightRow[];
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
  files: UnfilteredNightFile[],
  resolveProfile: DriverProfileLookup,
): AggregatedNightDriver[] => {
  const out: AggregatedNightDriver[] = [];
  files.forEach((file) => {
    file.drivers.forEach((d: NightDriverBlock) => {
      const profile = resolveProfile(d.vid);
      const transporter =
        profile.transporter || d.transporter || d.driverName || '';
      out.push({
        blockId: d.id,
        driverName: d.driverName,
        vid: d.vid,
        period: d.period,
        transporter,
        matchedDriverName: profile.driverName || NOT_FOUND,
        rows: d.rows,
        fileTitle: file.title,
        fileId: file.id,
        uploadedBy: file.uploaderName,
      });
    });
  });
  return out;
};

export const useUnfilteredNightsData = (uploaderId?: string, fileId?: string) => {
  const allFiles = useAppSelector((s) => s.unfilteredNights.files);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const { isTransporterStaff, matchesTransporter } = useUserScope();
  const files = useMemo(
    () =>
      allFiles.filter(
        (f) =>
          (!uploaderId || f.uploaderId === uploaderId) && (!fileId || f.id === fileId),
      ),
    [allFiles, uploaderId, fileId],
  );

  const [filters, setFilters] = useState<NightFilters>(defaultFilters);

  const resolveProfile = useMemo(
    () => buildDriverProfileLookup(driverRecords),
    [driverRecords],
  );

  const drivers = useMemo(() => {
    const flat = flatten(files, resolveProfile);
    if (!isTransporterStaff) return flat;
    return flat.filter((d) => matchesTransporter(d.transporter));
  }, [files, resolveProfile, isTransporterStaff, matchesTransporter]);

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

  const filtered = useMemo<AggregatedNightDriver[]>(() => {
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
