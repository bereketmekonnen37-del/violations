import type { DriverRecord } from '../types';

/** Sentinel used everywhere a VID has no matching row in the boss's list. */
export const NOT_FOUND = 'Not found';

export type DriverNameLookup = (vid: string) => string;

export interface DriverProfile {
  driverName: string;
  transporter: string;
}

export type DriverProfileLookup = (vid: string) => DriverProfile;

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

export const buildDriverProfileLookup = (
  records: DriverRecord[],
): DriverProfileLookup => {
  const map = new Map<string, DriverProfile>();
  records.forEach((r) => {
    const key = normalizeVid(r.vid);
    if (!key || map.has(key)) return;
    map.set(key, {
      driverName: r.driverName ?? '',
      transporter: r.transporter ?? '',
    });
  });
  return (vid: string) =>
    map.get(normalizeVid(vid)) ?? { driverName: '', transporter: '' };
};
