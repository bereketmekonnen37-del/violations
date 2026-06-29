import { useMemo, useState } from 'react';
import { useAppSelector } from '../../app/store';
import { buildFuse, tokensMatch } from '../../lib/fuseSearch';
import type { DriverBlock, OverspeedEvent, UnfilteredFile } from '../../types';

export interface UnfilteredFilters {
  driver: string;
  vid: string;
  dateFrom: string;
  dateTo: string;
  eventType: string;
  gps: 'all' | 'present' | 'missing';
  location: string;
  transporter: string;
}

const defaultFilters: UnfilteredFilters = {
  driver: '',
  vid: '',
  dateFrom: '',
  dateTo: '',
  eventType: '',
  gps: 'all',
  location: '',
  transporter: '',
};

export interface AggregatedDriver {
  blockId: string;
  driverName: string;
  vid: string;
  period: string;
  transporter: string;
  events: OverspeedEvent[];
  fileTitle: string;
  fileId: string;
  uploadedBy: string;
}

const parseEventDate = (s: string): number | null => {
  if (!s) return null;
  const trimmed = s.trim();
  const d = new Date(trimmed.replace(' ', 'T'));
  if (!Number.isNaN(d.getTime())) return d.getTime();
  const d2 = new Date(trimmed);
  if (!Number.isNaN(d2.getTime())) return d2.getTime();
  return null;
};

const flattenDrivers = (files: UnfilteredFile[]): AggregatedDriver[] => {
  const out: AggregatedDriver[] = [];
  files.forEach((file) => {
    file.drivers.forEach((d: DriverBlock) => {
      out.push({
        blockId: d.id,
        driverName: d.driverName,
        vid: d.vid,
        period: d.period,
        transporter: d.transporter,
        events: d.events,
        fileTitle: file.title,
        fileId: file.id,
        uploadedBy: file.uploaderName,
      });
    });
  });
  return out;
};

export const useUnfilteredData = (uploaderId?: string, fileId?: string) => {
  const allFiles = useAppSelector((s) => s.unfiltered.files);
  const files = useMemo(
    () =>
      allFiles.filter(
        (f) =>
          (!uploaderId || f.uploaderId === uploaderId) && (!fileId || f.id === fileId),
      ),
    [allFiles, uploaderId, fileId],
  );

  const [filters, setFilters] = useState<UnfilteredFilters>(defaultFilters);

  const drivers = useMemo(() => flattenDrivers(files), [files]);

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    drivers.forEach((d) => d.events.forEach((e) => e.eventType && set.add(e.eventType)));
    return Array.from(set).sort();
  }, [drivers]);

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

  const filtered = useMemo<AggregatedDriver[]>(() => {
    let base = drivers;

    if (filters.driver.trim()) {
      const ids = new Set(driverFuse.search(filters.driver.trim()).map((h) => h.item.blockId));
      base = base.filter((d) => ids.has(d.blockId));
    }
    if (filters.vid.trim()) {
      const q = filters.vid.trim().toLowerCase();
      base = base.filter((d) => d.vid.toLowerCase().includes(q));
    }
    if (filters.transporter.trim()) {
      const ids = new Set(
        transporterFuse.search(filters.transporter.trim()).map((h) => h.item.blockId),
      );
      base = base.filter((d) => ids.has(d.blockId));
    }

    const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
    const to = filters.dateTo
      ? new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1
      : null;

    return base
      .map((d) => {
        let events = d.events;

        if (filters.eventType && filters.eventType !== 'all') {
          events = events.filter(
            (e) => e.eventType.toLowerCase() === filters.eventType.toLowerCase(),
          );
        }
        if (filters.gps !== 'all') {
          events = events.filter((e) =>
            filters.gps === 'present' ? !!e.gpsCoords : !e.gpsCoords,
          );
        }
        if (filters.location.trim()) {
          events = events.filter((e) =>
            tokensMatch(`${e.location} ${e.overspeedPosition}`, filters.location),
          );
        }
        if (from !== null || to !== null) {
          events = events.filter((e) => {
            const t = parseEventDate(e.start) ?? parseEventDate(e.end);
            if (t === null) return false;
            if (from !== null && t < from) return false;
            if (to !== null && t > to) return false;
            return true;
          });
        }
        return { ...d, events };
      })
      .filter((d) => d.events.length > 0)
      .sort((a, b) => b.events.length - a.events.length);
  }, [drivers, filters, driverFuse, transporterFuse]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.driver.trim()) n++;
    if (filters.vid.trim()) n++;
    if (filters.dateFrom) n++;
    if (filters.dateTo) n++;
    if (filters.eventType && filters.eventType !== 'all') n++;
    if (filters.gps !== 'all') n++;
    if (filters.location.trim()) n++;
    if (filters.transporter.trim()) n++;
    return n;
  }, [filters]);

  const totalEvents = useMemo(
    () => drivers.reduce((sum, d) => sum + d.events.length, 0),
    [drivers],
  );
  const matchedEvents = useMemo(
    () => filtered.reduce((sum, d) => sum + d.events.length, 0),
    [filtered],
  );

  return {
    files,
    drivers,
    filtered,
    filters,
    setFilters,
    reset: () => setFilters(defaultFilters),
    eventTypes,
    transporters,
    activeCount,
    totalEvents,
    matchedEvents,
  };
};
