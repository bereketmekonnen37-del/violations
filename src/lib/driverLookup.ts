import type { DriverRecord } from '../types';

export type DriverNameLookup = (vid: string) => string;

const normalizeVid = (vid: string): string =>
  String(vid ?? '')
    .replace(/[^0-9a-zA-Z]+/g, '')
    .toLowerCase();

export const buildDriverLookup = (records: DriverRecord[]): DriverNameLookup => {
  const map = new Map<string, string>();
  records.forEach((r) => {
    const key = normalizeVid(r.vid);
    if (key && !map.has(key)) {
      map.set(key, r.driverName);
    }
  });
  return (vid: string) => map.get(normalizeVid(vid)) ?? '';
};
