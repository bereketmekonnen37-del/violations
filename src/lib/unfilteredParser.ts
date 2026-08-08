import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { newId } from './utils';
import { formatLocalDate, formatSerialIfNumeric } from './excelDate';
import type {
  ContinuousSource,
  DriverBlock,
  OverspeedEvent,
  UnfilteredFileKind,
} from '../types';

export const detectUnfilteredKind = (file: File): UnfilteredFileKind | null => {
  const n = file.name.toLowerCase();
  if (n.endsWith('.csv')) return 'csv';
  if (n.endsWith('.xlsx')) return 'xlsx';
  if (n.endsWith('.xls')) return 'xls';
  return null;
};

/** `.xlsx` = Global export, `.xls` / `.csv` = Mela export. */
export const detectUnfilteredSource = (
  kind: UnfilteredFileKind,
): ContinuousSource => (kind === 'xlsx' ? 'global' : 'mela');

/* ──────────────────── helpers ──────────────────── */

const cleanText = (raw: unknown): string => {
  if (raw instanceof Date) return formatLocalDate(raw);
  const s = String(raw ?? '');
  return s
    .replace(/ /g, ' ')
    .replace(/[°º]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeHeader = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[°º]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isBlank = (row: string[]): boolean =>
  row.every((c) => !c || !c.trim());

const joinCells = (row: string[]): string =>
  row.map((c) => cleanText(c)).filter(Boolean).join(' ');

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
  const result: Array<{ kind: LabelKind; value: string }> = [];
  positions.forEach((p, i) => {
    if (!p.kind) return;
    const next = positions[i + 1];
    const end = next ? next.start : line.length;
    const value = cleanText(line.slice(p.valueStart, end));
    result.push({ kind: p.kind, value });
  });
  return result;
};

const extractVidFromObject = (raw: string): string => {
  const cleaned = cleanText(raw);
  const m = cleaned.match(/(\d{4})/);
  return m ? m[1] : '';
};

/**
 * Mela `Object:` cell — pattern "2607-(3-59466 ET)". Parens hold the plate.
 */
const extractPlateFromObject = (raw: string): string => {
  const tag = cleanText(raw).match(/\(([^)]+)\)/);
  if (!tag) return '';
  return tag[1].replace(/\b(ET|et)\b/g, '').trim();
};

/**
 * Global `Vehicle` / `Plate` cell — "3-36190(3229)" → plate "3-36190", vid "3229".
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

const HEADER_ALIASES = {
  start: ['start', 'begin', 'start time', 'from'],
  end: ['end', 'finish', 'end time', 'to'],
  duration: ['duration', 'length', 'elapsed'],
  topSpeed: ['top speed', 'max speed', 'speed', 'kmh', 'km h'],
  overspeedPosition: [
    'overspeed position',
    'position',
    'location position',
    'place',
    'address',
  ],
  location: ['location', 'place', 'route', 'address'],
  gpsCoords: ['gps', 'coordinates', 'coords', 'latlng', 'lat lng', 'lat long'],
  remarks: ['remarks', 'note', 'notes', 'comment', 'comments'],
  eventType: ['event', 'event type', 'type', 'violation', 'violation type'],
} as const;

type FieldKey = keyof typeof HEADER_ALIASES;

const findHeaderColumns = (row: string[]): Partial<Record<FieldKey, number>> => {
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

const looksLikeOverspeedHeader = (row: string[]): boolean => {
  const cols = findHeaderColumns(row);
  return cols.start !== undefined && cols.end !== undefined;
};

const looksLikeMetaLine = (line: string): boolean =>
  /\b(object|group|period)\b\s*[:\-]/i.test(line);

const normalizeSpeed = (s: string): string => {
  const c = cleanText(s);
  if (!c) return '';
  // If only a number, append unit.
  if (/^\d+(\.\d+)?$/.test(c)) return `${c} km/h`;
  return c.replace(/km\s*[\/]?\s*h(r)?/i, 'km/h');
};

const normalizeDuration = (s: string): string => {
  const c = cleanText(s);
  if (!c) return '';
  return c
    .replace(/\bsecs?\b/i, 'sec')
    .replace(/\bmins?\b/i, 'min')
    .replace(/\bhrs?\b/i, 'hr');
};

/* ──────────────────── loaders ──────────────────── */

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

/* ──────────────────── block walker ──────────────────── */

const buildEvent = (
  row: string[],
  cols: Partial<Record<FieldKey, number>>,
): OverspeedEvent | null => {
  const pick = (k: FieldKey): string => {
    const i = cols[k];
    if (i === undefined) return '';
    return cleanText(row[i] ?? '');
  };
  const start = formatSerialIfNumeric(pick('start'));
  const end = formatSerialIfNumeric(pick('end'));
  const duration = normalizeDuration(pick('duration'));
  const topSpeed = normalizeSpeed(pick('topSpeed'));
  const overspeedPosition = pick('overspeedPosition');
  const location = pick('location') || overspeedPosition;
  const gpsCoords = pick('gpsCoords');
  const remarks = pick('remarks');
  const eventType = pick('eventType') || 'Overspeed';

  // Require at least one meaningful field to avoid noise rows.
  if (!start && !end && !duration && !topSpeed && !overspeedPosition) return null;

  return {
    id: newId(),
    start,
    end,
    duration,
    topSpeed,
    overspeedPosition,
    location,
    gpsCoords,
    remarks,
    eventType,
    transporter: '',
  };
};

const makeBlock = (source: ContinuousSource): DriverBlock => ({
  id: newId(),
  driverName: '',
  vid: '',
  plate: '',
  period: '',
  transporter: '',
  source,
  events: [],
});

export const parseUnstructuredRows = (rows: string[][]): DriverBlock[] => {
  const blocks: DriverBlock[] = [];
  let current: DriverBlock | null = null;
  let activeCols: Partial<Record<FieldKey, number>> | null = null;

  for (const rawRow of rows) {
    const row = rawRow.map((c) => cleanText(c));
    if (isBlank(row)) continue;

    const line = joinCells(row);

    // ── Block-level fields (handle multiple labels on one row) ──
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
          // `Group:` is the transporter in the master sheet, but the existing
          // UI already renders `driverName` prominently — mirror it so neither
          // surface loses signal.
          current.driverName = value;
          current.transporter = value;
        } else if (l.kind === 'period') {
          current.period = cleanText(l.value);
        }
      }
      continue;
    }

    if (!current) continue;

    // ── Column header inside a block ──
    if (looksLikeOverspeedHeader(row)) {
      activeCols = findHeaderColumns(row);
      continue;
    }

    // Skip stray meta-ish lines that aren't data.
    if (looksLikeMetaLine(line) && !activeCols) continue;

    // ── Data row ──
    if (activeCols) {
      const event = buildEvent(row, activeCols);
      if (event) {
        if (current.transporter) event.transporter = current.transporter;
        current.events.push(event);
      }
    }
  }

  if (current) blocks.push(current);

  // Filter out blocks that have no usable identity AND no events.
  return blocks.filter(
    (b) => (b.driverName || b.vid) && (b.events.length > 0 || b.period),
  );
};

/* ─────────────────────────── Global (.xlsx) format ─────────────────────────
 * Header row: Vehicle | Plate | Owner | Start Time | Duration | Max Speed
 *             | Location | Coordinates
 * Each data row is one overspeed event. Rows are grouped by VID (fallback:
 * plate + owner) into DriverBlocks so the boss UI can reuse the same model
 * as the Mela path.
 */
const GLOBAL_ALIASES = {
  vehicle: ['vehicle'],
  plate: ['plate'],
  owner: ['owner', 'driver', 'group'],
  start: ['start time', 'start', 'begin'],
  duration: ['duration', 'length', 'elapsed'],
  maxSpeed: ['max speed', 'top speed', 'speed'],
  location: ['location', 'place', 'address'],
  coordinates: ['coordinates', 'gps', 'coords', 'latlng', 'lat lng'],
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
  if (out.start === undefined) return null;
  if (out.vehicle === undefined && out.plate === undefined) return null;
  return out;
};

export const parseGlobalSpeedRows = (rows: string[][]): DriverBlock[] => {
  let cols: Partial<Record<GlobalField, number>> | null = null;
  const byKey = new Map<string, DriverBlock>();

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
    const start = formatSerialIfNumeric(pick('start'));
    if (!start) continue;

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

    const location = pick('location');
    const gpsCoords = pick('coordinates');
    block.events.push({
      id: newId(),
      start,
      end: '',
      duration: normalizeDuration(pick('duration')),
      topSpeed: normalizeSpeed(pick('maxSpeed')),
      overspeedPosition: location || gpsCoords,
      location,
      gpsCoords,
      remarks: '',
      eventType: 'Overspeed',
      transporter: owner,
    });
  }

  return Array.from(byKey.values()).filter((b) => b.events.length > 0);
};

/* ──────────────────── public API ──────────────────── */

export const parseUnfilteredFile = async (
  file: File,
  kind: UnfilteredFileKind,
): Promise<DriverBlock[]> => {
  const rows =
    kind === 'csv' ? await csvToRows(file) : await xlsxToRows(file);
  return detectUnfilteredSource(kind) === 'global'
    ? parseGlobalSpeedRows(rows)
    : parseUnstructuredRows(rows);
};
