import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { newId } from './utils';
import { formatLocalDate, formatSerialIfNumeric } from './excelDate';
import type {
  ContinuousDriverBlock,
  ContinuousRow,
  ContinuousSource,
  UnfilteredFileKind,
} from '../types';

export const detectContinuousKind = (file: File): UnfilteredFileKind | null => {
  const n = file.name.toLowerCase();
  if (n.endsWith('.csv')) return 'csv';
  if (n.endsWith('.xlsx')) return 'xlsx';
  if (n.endsWith('.xls')) return 'xls';
  return null;
};

/**
 * File-extension convention agreed with the team:
 *   .xlsx → Global export  (Vehicle / Plate / Owner / Start Time … columns)
 *   .xls  → Mela  export   (Travel Sheet with Object/Group/Period blocks)
 *   .csv  → treated as Mela (matches the historical staff workflow)
 */
export const detectContinuousSource = (
  kind: UnfilteredFileKind,
): ContinuousSource => (kind === 'xlsx' ? 'global' : 'mela');

const cleanText = (raw: unknown): string => {
  if (raw instanceof Date) return formatLocalDate(raw);
  return String(raw ?? '')
    .replace(/ /g, ' ')
    .replace(/[°º]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeHeader = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const isBlank = (row: string[]): boolean => row.every((c) => !c || !c.trim());

const joinCells = (row: string[]): string =>
  row.map((c) => cleanText(c)).filter(Boolean).join(' ');

const extractVidFromObject = (raw: string): string => {
  const m = cleanText(raw).match(/(\d{4})/);
  return m ? m[1] : '';
};

const extractTransporterFromObject = (raw: string): string => {
  const tag = cleanText(raw).match(/\(([^)]+)\)/);
  if (!tag) return '';
  return tag[1].replace(/\b(ET|et)\b/g, '').trim();
};

/**
 * Mela `Object:` cell examples:
 *   "2549-(3-49646 ET)"  → plate 3-49646
 *   "2551 (3-66332 ET)"  → plate 3-66332
 * The plate lives inside the parentheses; strip the ET/et suffix.
 */
const extractPlateFromObject = (raw: string): string =>
  extractTransporterFromObject(raw);

/**
 * Global `Vehicle` / `Plate` cell example: "3-36542(2784)"
 *   → plate "3-36542", vid "2784"
 * Falls back gracefully when either side is missing.
 */
const extractPlateAndVidFromVehicle = (
  raw: string,
): { plate: string; vid: string } => {
  const c = cleanText(raw);
  const paren = c.match(/^(.*?)\s*\((\d+)\s*\)\s*$/);
  if (paren) return { plate: paren[1].trim(), vid: paren[2].trim() };
  const digits = c.match(/(\d{3,})/);
  return { plate: c, vid: digits ? digits[1] : '' };
};

/* Inline label extractor — mirrors speed / nights parsers */
type LabelKind = 'object' | 'group' | 'period';
const LABEL_PATTERN =
  /\b(object|unit|vehicle|group|driver name|driver|period|date range|range)\b\s*[:\-]\s*/gi;

const normalizeLabel = (raw: string): LabelKind | null => {
  const r = raw.toLowerCase();
  if (r === 'object' || r === 'unit' || r === 'vehicle') return 'object';
  if (r === 'group' || r === 'driver' || r === 'driver name') return 'group';
  if (r === 'period' || r === 'date range' || r === 'range') return 'period';
  return null;
};

const extractInlineLabels = (
  line: string,
): Array<{ kind: LabelKind; value: string }> => {
  const re = new RegExp(LABEL_PATTERN.source, LABEL_PATTERN.flags);
  const positions: Array<{ kind: LabelKind | null; valueStart: number; start: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    positions.push({
      kind: normalizeLabel(m[1]),
      valueStart: m.index + m[0].length,
      start: m.index,
    });
  }
  const out: Array<{ kind: LabelKind; value: string }> = [];
  positions.forEach((p, i) => {
    if (!p.kind) return;
    const next = positions[i + 1];
    const end = next ? next.start : line.length;
    out.push({ kind: p.kind, value: cleanText(line.slice(p.valueStart, end)) });
  });
  return out;
};

const HEADER_ALIASES = {
  timeA: ['time a', 'timea', 'start time', 'time from'],
  positionA: ['position a', 'positiona', 'location a', 'from'],
  timeB: ['time b', 'timeb', 'end time', 'time to'],
  positionB: ['position b', 'positionb', 'location b', 'to'],
  duration: ['duration', 'length time', 'elapsed'],
  length: ['length', 'distance', 'distance km', 'km'],
} as const;

type FieldKey = keyof typeof HEADER_ALIASES;

const findHeaderColumns = (
  row: string[],
): Partial<Record<FieldKey, number>> => {
  const norm = row.map((c) => normalizeHeader(c));
  const out: Partial<Record<FieldKey, number>> = {};
  (Object.keys(HEADER_ALIASES) as FieldKey[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field];
    let bestIdx = -1;
    norm.forEach((cell, idx) => {
      if (!cell) return;
      for (const alias of aliases) {
        if (cell === alias) {
          bestIdx = idx;
          break;
        }
      }
    });
    if (bestIdx === -1) {
      norm.forEach((cell, idx) => {
        if (!cell) return;
        for (const alias of aliases) {
          if (cell.includes(alias)) {
            if (bestIdx === -1) bestIdx = idx;
            break;
          }
        }
      });
    }
    if (bestIdx !== -1) out[field] = bestIdx;
  });
  return out;
};

const looksLikeContinuousHeader = (row: string[]): boolean => {
  const cols = findHeaderColumns(row);
  return cols.timeA !== undefined && cols.timeB !== undefined;
};

const looksLikeMetaLine = (line: string): boolean =>
  /\b(object|group|period|travel sheet)\b/i.test(line);

const looksLikeEmptyBlockNotice = (line: string): boolean =>
  /nothing has been found/i.test(line);

const normalizeDuration = (s: string): string => {
  const c = cleanText(s);
  if (!c) return '';
  return c
    .replace(/\bsecs?\b/i, 's')
    .replace(/\bmins?\b/i, 'min')
    .replace(/\bhrs?\b/i, 'h');
};

const normalizeLength = (s: string): string => {
  const c = cleanText(s);
  if (!c) return '';
  if (/^[\d.]+$/.test(c)) return `${c} km`;
  return c.replace(/\bkilometers?\b/i, 'km');
};

const buildRow = (
  row: string[],
  cols: Partial<Record<FieldKey, number>>,
): ContinuousRow | null => {
  const pick = (k: FieldKey): string => {
    const i = cols[k];
    if (i === undefined) return '';
    return cleanText(row[i] ?? '');
  };
  const timeA = formatSerialIfNumeric(pick('timeA'));
  const timeB = formatSerialIfNumeric(pick('timeB'));

  // Summary sub-total rows have empty Time A / Time B but populated Duration + Length.
  // Skip them — only keep real trip rows.
  if (!timeA || !timeB) return null;

  return {
    id: newId(),
    timeA,
    positionA: pick('positionA'),
    timeB,
    positionB: pick('positionB'),
    duration: normalizeDuration(pick('duration')),
    length: normalizeLength(pick('length')),
  };
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

const makeBlock = (source: ContinuousSource): ContinuousDriverBlock => ({
  id: newId(),
  driverName: '',
  vid: '',
  plate: '',
  period: '',
  transporter: '',
  source,
  rows: [],
});

export const parseContinuousRows = (
  rows: string[][],
): ContinuousDriverBlock[] => {
  const blocks: ContinuousDriverBlock[] = [];
  let current: ContinuousDriverBlock | null = null;
  let activeCols: Partial<Record<FieldKey, number>> | null = null;

  for (const rawRow of rows) {
    const row = rawRow.map((c) => cleanText(c));
    if (isBlank(row)) continue;

    const line = joinCells(row);

    if (looksLikeEmptyBlockNotice(line)) continue;
    if (/^travel\s+sheet/i.test(line)) continue;

    const labels = extractInlineLabels(line);
    if (labels.length > 0) {
      const hasObject = labels.some((l) => l.kind === 'object');
      if (hasObject) {
        if (current) blocks.push(current);
        current = makeBlock('mela');
        activeCols = null;
      } else if (!current) {
        current = makeBlock('mela');
      }
      for (const l of labels) {
        if (!current) continue;
        if (l.kind === 'object') {
          current.vid = extractVidFromObject(l.value);
          current.plate = extractPlateFromObject(l.value);
          current.transporter = extractTransporterFromObject(l.value);
        } else if (l.kind === 'group') {
          current.driverName = cleanText(l.value);
        } else if (l.kind === 'period') {
          current.period = cleanText(l.value);
        }
      }
      continue;
    }

    if (!current) continue;

    if (looksLikeContinuousHeader(row)) {
      activeCols = findHeaderColumns(row);
      continue;
    }

    if (looksLikeMetaLine(line) && !activeCols) continue;

    if (activeCols) {
      const r = buildRow(row, activeCols);
      if (r) current.rows.push(r);
    }
  }

  if (current) blocks.push(current);

  return blocks.filter((b) => b.driverName || b.vid);
};

/* ─────────────────────────── Global (.xlsx) format ─────────────────────────
 * Header row: Vehicle | Plate | Owner | Start Time | End Time | Driving Time
 *             | Distance | Average Speed | Max Speed | Start Location | End Location
 * Each data row is one trip. We group rows by VID (fallback: plate + owner)
 * so the boss UI can reuse the same driver-block model as the Mela path.
 */
const GLOBAL_ALIASES = {
  vehicle: ['vehicle'],
  plate: ['plate'],
  owner: ['owner', 'driver', 'group'],
  startTime: ['start time', 'time a', 'time from'],
  endTime: ['end time', 'time b', 'time to'],
  duration: ['driving time', 'duration'],
  length: ['distance', 'length'],
  startLocation: ['start location', 'position a', 'from'],
  endLocation: ['end location', 'position b', 'to'],
} as const;

type GlobalField = keyof typeof GLOBAL_ALIASES;

const findGlobalHeader = (
  row: string[],
): Partial<Record<GlobalField, number>> | null => {
  const norm = row.map((c) => normalizeHeader(c));
  const out: Partial<Record<GlobalField, number>> = {};
  (Object.keys(GLOBAL_ALIASES) as GlobalField[]).forEach((field) => {
    for (const alias of GLOBAL_ALIASES[field]) {
      const idx = norm.indexOf(alias);
      if (idx !== -1) {
        out[field] = idx;
        return;
      }
    }
  });
  if (out.startTime === undefined || out.endTime === undefined) return null;
  if (out.vehicle === undefined && out.plate === undefined) return null;
  return out;
};

export const parseGlobalRows = (
  rows: string[][],
): ContinuousDriverBlock[] => {
  let cols: Partial<Record<GlobalField, number>> | null = null;
  const byVid = new Map<string, ContinuousDriverBlock>();

  for (const rawRow of rows) {
    const row = rawRow.map((c) => cleanText(c));
    if (isBlank(row)) continue;
    if (!cols) {
      cols = findGlobalHeader(row);
      continue;
    }
    const pick = (k: GlobalField): string => {
      const i = cols![k];
      return i === undefined ? '' : cleanText(row[i] ?? '');
    };
    const timeA = formatSerialIfNumeric(pick('startTime'));
    const timeB = formatSerialIfNumeric(pick('endTime'));
    if (!timeA || !timeB) continue;

    const vehicleCell = pick('vehicle') || pick('plate');
    const { plate, vid } = extractPlateAndVidFromVehicle(vehicleCell);
    const owner = pick('owner');
    const key = vid || `${plate}|${owner}`.toLowerCase();
    if (!key) continue;

    let block = byVid.get(key);
    if (!block) {
      block = makeBlock('global');
      block.vid = vid;
      block.plate = plate;
      block.driverName = owner;
      block.transporter = plate;
      byVid.set(key, block);
    }

    block.rows.push({
      id: newId(),
      timeA,
      positionA: pick('startLocation'),
      timeB,
      positionB: pick('endLocation'),
      duration: normalizeDuration(pick('duration')),
      length: normalizeLength(pick('length')),
    });
  }

  return Array.from(byVid.values()).filter((b) => b.rows.length > 0);
};

export const parseContinuousFile = async (
  file: File,
  kind: UnfilteredFileKind,
): Promise<ContinuousDriverBlock[]> => {
  const rows = kind === 'csv' ? await csvToRows(file) : await xlsxToRows(file);
  return detectContinuousSource(kind) === 'global'
    ? parseGlobalRows(rows)
    : parseContinuousRows(rows);
};
