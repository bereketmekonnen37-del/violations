import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { newId } from './utils';
import { formatLocalDate, formatSerialIfNumeric } from './excelDate';
import type {
  ContinuousSource,
  NightDriverBlock,
  NightRow,
  UnfilteredFileKind,
} from '../types';

export const detectNightsKind = (file: File): UnfilteredFileKind | null => {
  const n = file.name.toLowerCase();
  if (n.endsWith('.csv')) return 'csv';
  if (n.endsWith('.xlsx')) return 'xlsx';
  if (n.endsWith('.xls')) return 'xls';
  return null;
};

/** `.xlsx` = Global export, `.xls` / `.csv` = Mela export. */
export const detectNightsSource = (
  kind: UnfilteredFileKind,
): ContinuousSource => (kind === 'xlsx' ? 'global' : 'mela');

const cleanText = (raw: unknown): string => {
  if (raw instanceof Date) return formatLocalDate(raw);
  return String(raw ?? '')
    .replace(/ /g, ' ')
    .replace(/°|º|&(?:deg|ordm|#0*176|#[xX]0*b0);/gi, '')
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

/** Mela `Object:` cell — parens hold the plate ("2549-(3-49646 ET)" → "3-49646"). */
const extractPlateFromObject = (raw: string): string => {
  const tag = cleanText(raw).match(/\(([^)]+)\)/);
  if (!tag) return '';
  return tag[1].replace(/\b(ET|et)\b/g, '').trim();
};

/** Global `Vehicle` / `Plate` cell — "3-31668(3223)" → plate "3-31668", vid "3223". */
const extractPlateAndVidFromVehicle = (
  raw: string,
): { plate: string; vid: string } => {
  const c = cleanText(raw);
  const paren = c.match(/^(.*?)\s*\((\d+)\s*\)\s*$/);
  if (paren) return { plate: paren[1].trim(), vid: paren[2].trim() };
  const digits = c.match(/(\d{3,})/);
  return { plate: c, vid: digits ? digits[1] : '' };
};

/* Inline label extractor (mirrors speed parser) */
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

/* Column detection */
const NIGHT_HEADER_ALIASES = {
  timeA: ['time a', 'timea', 'start time', 'time from'],
  positionA: ['position a', 'positiona', 'location a', 'from'],
  timeB: ['time b', 'timeb', 'end time', 'time to'],
  positionB: ['position b', 'positionb', 'location b', 'to'],
  duration: ['duration', 'length time', 'elapsed'],
  length: ['length', 'distance', 'distance km', 'km'],
} as const;

type NightFieldKey = keyof typeof NIGHT_HEADER_ALIASES;

const findNightHeaderColumns = (
  row: string[],
): Partial<Record<NightFieldKey, number>> => {
  const norm = row.map((c) => normalizeHeader(c));
  const out: Partial<Record<NightFieldKey, number>> = {};
  (Object.keys(NIGHT_HEADER_ALIASES) as NightFieldKey[]).forEach((field) => {
    const aliases = NIGHT_HEADER_ALIASES[field];
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

const looksLikeNightHeader = (row: string[]): boolean => {
  const cols = findNightHeaderColumns(row);
  // Require Time A AND Time B OR a Length column to qualify.
  return (
    cols.timeA !== undefined &&
    (cols.timeB !== undefined || cols.positionA !== undefined)
  );
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
  cols: Partial<Record<NightFieldKey, number>>,
): NightRow | null => {
  const pick = (k: NightFieldKey): string => {
    const i = cols[k];
    if (i === undefined) return '';
    return cleanText(row[i] ?? '');
  };
  const timeA = formatSerialIfNumeric(pick('timeA'));
  const positionA = pick('positionA');
  const timeB = formatSerialIfNumeric(pick('timeB'));
  const positionB = pick('positionB');
  const duration = normalizeDuration(pick('duration'));
  const length = normalizeLength(pick('length'));

  if (!timeA && !timeB && !duration && !length && !positionA && !positionB) return null;

  return {
    id: newId(),
    timeA,
    positionA,
    timeB,
    positionB,
    duration,
    length,
  };
};

const xlsxToRows = async (file: File): Promise<string[][]> => {
  const buf = await file.arrayBuffer();
  // Do NOT pass cellDates:true — that makes SheetJS build JS Date objects
  // via the local-time constructor, which combined with UTC-accessor
  // formatting produces a timezone offset shift on the way out. Leaving
  // the option off keeps date cells as raw Excel serial numbers; we then
  // format them via XLSX.SSF (timezone-agnostic) in formatSerialIfNumeric.
  const wb = XLSX.read(buf, { type: 'array' });
  const all: string[][] = [];
  wb.SheetNames.forEach((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: true,
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

const makeBlock = (source: ContinuousSource): NightDriverBlock => ({
  id: newId(),
  driverName: '',
  vid: '',
  plate: '',
  period: '',
  transporter: '',
  source,
  rows: [],
});

export const parseNightRows = (rows: string[][]): NightDriverBlock[] => {
  const blocks: NightDriverBlock[] = [];
  let current: NightDriverBlock | null = null;
  let activeCols: Partial<Record<NightFieldKey, number>> | null = null;

  for (const rawRow of rows) {
    const row = rawRow.map((c) => cleanText(c));
    if (isBlank(row)) continue;

    const line = joinCells(row);

    if (looksLikeEmptyBlockNotice(line)) {
      // Block exists but had no events; keep current block as-is.
      continue;
    }

    // Skip the "Travel sheet (Unauthorized Time)" title line — block start is driven by Object:
    if (/^travel\s+sheet/i.test(line)) {
      continue;
    }

    // Multi-label header rows
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
        } else if (l.kind === 'group') {
          const value = cleanText(l.value);
          // `Group:` doubles as the transporter on the master sheet; mirror
          // it into `driverName` so the existing per-file UI stays intact.
          current.driverName = value;
          current.transporter = value;
        } else if (l.kind === 'period') {
          current.period = cleanText(l.value);
        }
      }
      continue;
    }

    if (!current) continue;

    if (looksLikeNightHeader(row)) {
      activeCols = findNightHeaderColumns(row);
      continue;
    }

    if (looksLikeMetaLine(line) && !activeCols) continue;

    if (activeCols) {
      const nr = buildRow(row, activeCols);
      if (nr) current.rows.push(nr);
    }
  }

  if (current) blocks.push(current);

  // Keep blocks that have at least a driver identity (rows can be empty — e.g. "Nothing found").
  return blocks.filter((b) => b.driverName || b.vid);
};

/* ─────────────────────────── Global (.xlsx) format ─────────────────────────
 * Header row: Vehicle | Plate | Owner | Start Time | End Time | Total Duration
 *             | Night Duration | Distance | Average Speed | Max Speed
 *             | Start Location | End Location
 * `Night Duration` is the value we surface as Duration on the master sheet;
 * `Total Duration` is ignored. `Distance` maps 1:1 to Mela's `Length`.
 */
const GLOBAL_ALIASES = {
  vehicle: ['vehicle'],
  plate: ['plate'],
  owner: ['owner', 'driver', 'group'],
  startTime: ['start time', 'time a', 'time from'],
  endTime: ['end time', 'time b', 'time to'],
  nightDuration: ['night duration'],
  totalDuration: ['total duration', 'duration'],
  distance: ['distance', 'length'],
  averageSpeed: ['average speed', 'avg speed'],
  maxSpeed: ['max speed', 'top speed'],
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
  if (out.startTime === undefined) return null;
  if (out.vehicle === undefined && out.plate === undefined) return null;
  return out;
};

const normalizeSpeed = (s: string): string => {
  const c = cleanText(s);
  if (!c) return '';
  if (/^\d+(\.\d+)?$/.test(c)) return `${c} km/h`;
  return c.replace(/km\s*[\/]?\s*h(r)?/i, 'km/h');
};

export const parseGlobalNightRows = (
  rows: string[][],
): NightDriverBlock[] => {
  let cols: Partial<Record<GlobalField, number>> | null = null;
  const byKey = new Map<string, NightDriverBlock>();

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
    if (!timeA && !timeB) continue;

    const vehicleCell = pick('vehicle') || pick('plate');
    const { plate, vid } = extractPlateAndVidFromVehicle(vehicleCell);
    const owner = pick('owner');
    const key = vid || `${plate}|${owner}`.toLowerCase();
    if (!key) continue;

    let block = byKey.get(key);
    if (!block) {
      block = makeBlock('global');
      block.vid = vid;
      block.plate = plate;
      block.driverName = owner;
      block.transporter = owner;
      byKey.set(key, block);
    }

    block.rows.push({
      id: newId(),
      timeA,
      positionA: pick('startLocation'),
      timeB,
      positionB: pick('endLocation'),
      duration: normalizeDuration(pick('nightDuration') || pick('totalDuration')),
      length: normalizeLength(pick('distance')),
      averageSpeed: normalizeSpeed(pick('averageSpeed')),
      maxSpeed: normalizeSpeed(pick('maxSpeed')),
    });
  }

  return Array.from(byKey.values()).filter((b) => b.rows.length > 0);
};

export const parseNightsFile = async (
  file: File,
  kind: UnfilteredFileKind,
): Promise<NightDriverBlock[]> => {
  const rows = kind === 'csv' ? await csvToRows(file) : await xlsxToRows(file);
  return detectNightsSource(kind) === 'global'
    ? parseGlobalNightRows(rows)
    : parseNightRows(rows);
};
