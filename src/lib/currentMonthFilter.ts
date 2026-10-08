import { parseEventDate } from './locationRules';
import type {
  UnfilteredContinuousFile,
  UnfilteredFile,
  UnfilteredNightFile,
} from '../types';

const inMonth = (raw: string, year: number, month: number): boolean => {
  const d = parseEventDate(raw);
  return !!d && d.getFullYear() === year && d.getMonth() === month;
};

/**
 * Strip the three uploaded-file arrays down to just the events whose own
 * timestamp falls in the given month (defaults to the current calendar
 * month). File / driver blocks that end up empty are dropped so downstream
 * aggregators see a clean "this month only" dataset — mirroring the logic
 * the boss dashboard uses, but applied to the raw Redux slices so Master
 * Fleet and Transporters stay in sync with it.
 */
export const filterFilesToCurrentMonth = (
  speed: UnfilteredFile[],
  nights: UnfilteredNightFile[],
  continuous: UnfilteredContinuousFile[],
  reference: Date = new Date(),
): {
  speed: UnfilteredFile[];
  nights: UnfilteredNightFile[];
  continuous: UnfilteredContinuousFile[];
} => {
  const y = reference.getFullYear();
  const m = reference.getMonth();

  const speedOut: UnfilteredFile[] = [];
  speed.forEach((f) => {
    const drivers = f.drivers
      .map((d) => ({
        ...d,
        events: d.events.filter((e) => inMonth(e.start, y, m)),
      }))
      .filter((d) => d.events.length > 0);
    if (drivers.length === 0) return;
    speedOut.push({
      ...f,
      drivers,
      totalEvents: drivers.reduce((n, d) => n + d.events.length, 0),
    });
  });

  const nightsOut: UnfilteredNightFile[] = [];
  nights.forEach((f) => {
    const drivers = f.drivers
      .map((d) => ({
        ...d,
        rows: d.rows.filter((r) => inMonth(r.timeA, y, m)),
      }))
      .filter((d) => d.rows.length > 0);
    if (drivers.length === 0) return;
    nightsOut.push({
      ...f,
      drivers,
      totalRows: drivers.reduce((n, d) => n + d.rows.length, 0),
    });
  });

  const continuousOut: UnfilteredContinuousFile[] = [];
  continuous.forEach((f) => {
    const drivers = f.drivers
      .map((d) => ({
        ...d,
        rows: d.rows.filter((r) => inMonth(r.timeA, y, m)),
      }))
      .filter((d) => d.rows.length > 0);
    if (drivers.length === 0) return;
    continuousOut.push({
      ...f,
      drivers,
      totalRows: drivers.reduce((n, d) => n + d.rows.length, 0),
    });
  });

  return { speed: speedOut, nights: nightsOut, continuous: continuousOut };
};
