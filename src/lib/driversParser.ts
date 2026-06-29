import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { newId } from './utils';
import type { DriverRecord, UnfilteredFileKind } from '../types';

export const detectDriversKind = (file: File): UnfilteredFileKind | null => {
  const n = file.name.toLowerCase();
  if (n.endsWith('.csv')) return 'csv';
  if (n.endsWith('.xlsx')) return 'xlsx';
  if (n.endsWith('.xls')) return 'xls';
  return null;
};

const cleanText = (raw: unknown): string =>
  String(raw ?? '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeHeader = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const VID_ALIASES = ['vid', 'vehicle id', 'vehicle', 'object', 'unit', 'plate', 'truck', 'truck no', 'vehicle no'];
const NAME_ALIASES = ['driver', 'driver name', 'name', 'driver full name', 'full name'];

const findColumn = (headers: string[], aliases: string[]): number => {
  const norm = headers.map((h) => normalizeHeader(h));
  for (let i = 0; i < norm.length; i++) {
    if (aliases.includes(norm[i])) return i;
  }
  for (let i = 0; i < norm.length; i++) {
    for (const a of aliases) {
      if (norm[i].includes(a)) return i;
    }
  }
  return -1;
};

const extractVid = (raw: string): string => {
  const cleaned = cleanText(raw);
  const m = cleaned.match(/(\d{3,6})/);
  return m ? m[1] : cleaned;
};

const xlsxToRows = async (file: File): Promise<string[][]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const all: string[][] = [];
  wb.SheetNames.forEach((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
      blankrows: false,
    });
    rows.forEach((r) => {
      const arr = (Array.isArray(r) ? r : [r]).map((c) => cleanText(c));
      all.push(arr);
    });
  });
  return all;
};

const csvToRows = (file: File): Promise<string[][]> =>
  new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: false,
      complete: (r) =>
        resolve(
          (r.data as unknown[][]).map((row) =>
            (row ?? []).map((c) => cleanText(c)),
          ),
        ),
      error: reject,
    });
  });

export const parseDriverRecords = (rows: string[][]): DriverRecord[] => {
  let headerIdx = -1;
  let vidCol = -1;
  let nameCol = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c)) continue;
    const vc = findColumn(row, VID_ALIASES);
    const nc = findColumn(row, NAME_ALIASES);
    if (vc !== -1 && nc !== -1) {
      headerIdx = i;
      vidCol = vc;
      nameCol = nc;
      break;
    }
  }

  if (headerIdx === -1) {
    // Fallback: assume column 0 = VID, column 1 = driver name.
    headerIdx = -1;
    vidCol = 0;
    nameCol = 1;
  }

  const out: DriverRecord[] = [];
  const seen = new Set<string>();
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const vid = extractVid(row[vidCol] ?? '');
    const driverName = cleanText(row[nameCol] ?? '');
    if (!vid || !driverName) continue;
    if (seen.has(vid)) continue;
    seen.add(vid);
    out.push({ id: newId(), vid, driverName });
  }
  return out;
};

export const parseDriversFile = async (
  file: File,
  kind: UnfilteredFileKind,
): Promise<DriverRecord[]> => {
  const rows = kind === 'csv' ? await csvToRows(file) : await xlsxToRows(file);
  return parseDriverRecords(rows);
};
