import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { newId } from './utils';
import { formatJsDate, formatSerialIfNumeric } from './excelDate';
import type {
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

const cleanText = (raw: unknown): string => {
  if (raw instanceof Date) return formatJsDate(raw);
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
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
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

const makeBlock = (): NightDriverBlock => ({
  id: newId(),
  driverName: '',
  vid: '',
  period: '',
  transporter: '',
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
        current = makeBlock();
        activeCols = null;
      } else if (!current) {
        current = makeBlock();
      }
      for (const l of labels) {
        if (!current) continue;
        if (l.kind === 'object') {
          current.vid = extractVidFromObject(l.value);
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

export const parseNightsFile = async (
  file: File,
  kind: UnfilteredFileKind,
): Promise<NightDriverBlock[]> => {
  const rows = kind === 'csv' ? await csvToRows(file) : await xlsxToRows(file);
  return parseNightRows(rows);
};
