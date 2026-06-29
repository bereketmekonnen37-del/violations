import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import type { GpsStatus, ViolationRecord } from '../../types';

export interface ViolationFilters {
  query: string;
  driverName: string;
  vid: string;
  date: string;
  eventType: string;
  location: string;
  transporter: string;
  gps: 'all' | GpsStatus;
  minViolations: number;
}

const defaultFilters: ViolationFilters = {
  query: '',
  driverName: '',
  vid: '',
  date: '',
  eventType: '',
  location: '',
  transporter: '',
  gps: 'all',
  minViolations: 1,
};

const exactish = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.trim().toLowerCase());

const driverKey = (name: string) => name.trim().toLowerCase();

export const useViolationFilters = (records: ViolationRecord[]) => {
  const [filters, setFilters] = useState<ViolationFilters>(defaultFilters);

  const driverCounts = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      const key = driverKey(r.driverName);
      if (!key) return;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [records]);

  const getCount = (r: ViolationRecord) => driverCounts.get(driverKey(r.driverName)) ?? 1;

  const maxViolations = useMemo(() => {
    let max = 1;
    driverCounts.forEach((v) => {
      if (v > max) max = v;
    });
    return max;
  }, [driverCounts]);

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.eventType) set.add(r.eventType.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  const fuse = useMemo(
    () =>
      new Fuse(records, {
        includeScore: false,
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: 'driverName', weight: 0.35 },
          { name: 'location', weight: 0.35 },
          { name: 'transporter', weight: 0.3 },
        ],
      }),
    [records],
  );

  const fuzzyByField = useMemo(() => {
    return {
      driverName: new Fuse(records, {
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: ['driverName'],
      }),
      location: new Fuse(records, {
        threshold: 0.45,
        ignoreLocation: true,
        minMatchCharLength: 1,
        keys: ['location'],
      }),
      transporter: new Fuse(records, {
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: ['transporter'],
      }),
    };
  }, [records]);

  const filtered = useMemo(() => {
    let result = records;

    if (filters.query.trim()) {
      const hits = fuse.search(filters.query.trim());
      const ids = new Set(hits.map((h) => h.item.id));
      result = result.filter((r) => ids.has(r.id));
    }
    if (filters.driverName.trim()) {
      const hits = fuzzyByField.driverName.search(filters.driverName.trim());
      const ids = new Set(hits.map((h) => h.item.id));
      result = result.filter((r) => ids.has(r.id));
    }
    if (filters.location.trim()) {
      const hits = fuzzyByField.location.search(filters.location.trim());
      const ids = new Set(hits.map((h) => h.item.id));
      result = result.filter((r) => ids.has(r.id));
    }
    if (filters.transporter.trim()) {
      const hits = fuzzyByField.transporter.search(filters.transporter.trim());
      const ids = new Set(hits.map((h) => h.item.id));
      result = result.filter((r) => ids.has(r.id));
    }
    if (filters.vid.trim()) {
      result = result.filter((r) => exactish(r.vid, filters.vid));
    }
    if (filters.date.trim()) {
      result = result.filter((r) => exactish(r.date, filters.date));
    }
    if (filters.eventType && filters.eventType !== 'all') {
      result = result.filter(
        (r) => r.eventType.toLowerCase() === filters.eventType.toLowerCase(),
      );
    }
    if (filters.gps !== 'all') {
      result = result.filter((r) => r.gpsFunctionality === filters.gps);
    }
    if (filters.minViolations > 1) {
      result = result.filter((r) => getCount(r) >= filters.minViolations);
    }

    // Sort: worst drivers first (most repeated). Stable secondary sort by name + date.
    const sorted = [...result].sort((a, b) => {
      const ca = getCount(a);
      const cb = getCount(b);
      if (cb !== ca) return cb - ca;
      const na = a.driverName.toLowerCase();
      const nb = b.driverName.toLowerCase();
      if (na !== nb) return na < nb ? -1 : 1;
      return a.date.localeCompare(b.date);
    });

    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, filters, fuse, fuzzyByField, driverCounts]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.query.trim()) n++;
    if (filters.driverName.trim()) n++;
    if (filters.vid.trim()) n++;
    if (filters.date.trim()) n++;
    if (filters.eventType && filters.eventType !== 'all') n++;
    if (filters.location.trim()) n++;
    if (filters.transporter.trim()) n++;
    if (filters.gps !== 'all') n++;
    if (filters.minViolations > 1) n++;
    return n;
  }, [filters]);

  return {
    filters,
    setFilters,
    eventTypes,
    filtered,
    reset: () => setFilters(defaultFilters),
    activeCount,
    driverCounts,
    getCount,
    maxViolations,
  };
};
