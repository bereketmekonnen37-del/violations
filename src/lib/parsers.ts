import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { FileKind, GpsStatus, ViolationRecord } from '../types';
import { newId } from './utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const detectFileKind = (file: File): FileKind | null => {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  if (lower.endsWith('.xls')) return 'xls';
  if (lower.endsWith('.pdf')) return 'pdf';
  return null;
};

const HEADER_ALIASES: Record<keyof Omit<ViolationRecord, 'id'>, string[]> = {
  transporter: ['transporter', 'carrier', 'company', 'fleet'],
  driverName: ['driver name', 'driver', 'driver_name', 'name', 'operator'],
  vid: ['vid', 'vehicle id', 'vehicle_id', 'truck id', 'unit'],
  date: ['date', 'event date', 'datetime', 'timestamp', 'time'],
  eventType: ['event type', 'event_type', 'event', 'violation', 'violation type', 'type'],
  location: ['location', 'place', 'address', 'site', 'route'],
  distanceKmHr: [
    'km/hr',
    'kmh',
    'kph',
    'speed',
    'km/hr (distance)',
    'distance',
    'km',
    'kilometers',
  ],
  duration: ['duration', 'time taken', 'length', 'elapsed'],
  gpsFunctionality: [
    'gps',
    'gps functionality',
    'gps_status',
    'gps status',
    'gps_functionality',
  ],
  remarks: ['remarks', 'remark', 'notes', 'comment', 'comments', 'description'],
};

const normalize = (s: unknown): string =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');

const findKey = (headers: string[], aliases: string[]): string | null => {
  const normHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  for (const alias of aliases) {
    const target = normalize(alias);
    const exact = normHeaders.find((h) => h.norm === target);
    if (exact) return exact.raw;
  }
  for (const alias of aliases) {
    const target = normalize(alias);
    const partial = normHeaders.find((h) => h.norm.includes(target));
    if (partial) return partial.raw;
  }
  return null;
};

const toGpsStatus = (raw: unknown): GpsStatus => {
  const v = String(raw ?? '').trim().toLowerCase();
  if (!v) return 'unknown';
  if (['on', 'yes', 'y', 'true', '1', 'working', 'functional', 'ok'].includes(v))
    return 'on';
  if (['off', 'no', 'n', 'false', '0', 'not working', 'fault', 'faulty'].includes(v))
    return 'off';
  return 'unknown';
};

const mapRowsToRecords = (rows: Record<string, unknown>[]): ViolationRecord[] => {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const keyMap: Partial<Record<keyof Omit<ViolationRecord, 'id'>, string | null>> = {};
  (Object.keys(HEADER_ALIASES) as Array<keyof typeof HEADER_ALIASES>).forEach((field) => {
    keyMap[field] = findKey(headers, HEADER_ALIASES[field]);
  });

  return rows.map((row) => {
    const pick = (field: keyof typeof HEADER_ALIASES): string => {
      const k = keyMap[field];
      if (!k) return '';
      const v = row[k];
      return v === null || v === undefined ? '' : String(v).trim();
    };

    return {
      id: newId(),
      transporter: pick('transporter'),
      driverName: pick('driverName'),
      vid: pick('vid'),
      date: pick('date'),
      eventType: pick('eventType'),
      location: pick('location'),
      distanceKmHr: pick('distanceKmHr'),
      duration: pick('duration'),
      gpsFunctionality: toGpsStatus(pick('gpsFunctionality')),
      remarks: pick('remarks'),
    };
  });
};

export const parseCSV = (file: File): Promise<ViolationRecord[]> =>
  new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(mapRowsToRecords(result.data)),
      error: (err) => reject(err),
    });
  });

export const parseExcel = async (file: File): Promise<ViolationRecord[]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return [];
  const ws = wb.Sheets[firstSheet];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return mapRowsToRecords(json);
};

const splitPdfRowIntoCells = (line: string): string[] => {
  return line
    .split(/\s{2,}|\t+|\|/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

export const parsePDF = async (file: File): Promise<ViolationRecord[]> => {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;

  const allLines: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const itemsByY = new Map<number, string[]>();
    content.items.forEach((it) => {
      const item = it as { str: string; transform: number[] };
      const y = Math.round(item.transform[5]);
      const arr = itemsByY.get(y) ?? [];
      arr.push(item.str);
      itemsByY.set(y, arr);
    });
    const sortedYs = Array.from(itemsByY.keys()).sort((a, b) => b - a);
    sortedYs.forEach((y) => {
      const text = (itemsByY.get(y) ?? []).join(' ').replace(/\s+/g, ' ').trim();
      if (text) allLines.push(text);
    });
  }

  if (allLines.length < 2) return [];
  const headerLine = allLines[0];
  const headers = splitPdfRowIntoCells(headerLine);
  if (headers.length < 2) return [];

  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < allLines.length; i++) {
    const cells = splitPdfRowIntoCells(allLines[i]);
    if (cells.length === 0) continue;
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });
    rows.push(row);
  }
  return mapRowsToRecords(rows);
};

export const parseFile = async (
  file: File,
  kind: FileKind,
): Promise<ViolationRecord[]> => {
  switch (kind) {
    case 'csv':
      return parseCSV(file);
    case 'xlsx':
    case 'xls':
      return parseExcel(file);
    case 'pdf':
      return parsePDF(file);
  }
};
