import { supabase } from '../../lib/supabaseClient';
import {
  summarizeSnapshot,
  type SnapshotData,
  type SnapshotMeta,
  type SnapshotSummary,
} from '../../lib/snapshots';

const TABLE = 'master_fleet_snapshots';

interface MetaRow {
  id: string;
  name: string;
  created_at: string;
  created_by_name: string;
  summary: SnapshotSummary;
}

const toMeta = (row: MetaRow): SnapshotMeta => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  createdByName: row.created_by_name,
  summary: row.summary,
});

/** A missing table means the migration has not been run yet. */
const explain = (message: string): Error =>
  new Error(
    /master_fleet_snapshots|schema cache|does not exist/i.test(message)
      ? 'The saved-violations table is missing. Run the 20260920000000_master_fleet_snapshots.sql migration in Supabase, then try again.'
      : message,
  );

/* gzip + base64 keeps a snapshot with thousands of events small. */

const toBase64 = (bytes: Uint8Array): string => {
  let out = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(out);
};

const fromBase64 = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const pipe = async (
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> => {
  const blob = new Blob([bytes as BlobPart]);
  const out = blob.stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
};

const encode = async (
  data: SnapshotData,
): Promise<{ encoding: string; payload: string }> => {
  const json = new TextEncoder().encode(JSON.stringify(data));
  if (typeof CompressionStream === 'undefined') {
    return { encoding: 'json-base64', payload: toBase64(json) };
  }
  return {
    encoding: 'gzip-base64',
    payload: toBase64(await pipe(json, new CompressionStream('gzip'))),
  };
};

const decode = async (encoding: string, payload: string): Promise<SnapshotData> => {
  let bytes = fromBase64(payload);
  if (encoding === 'gzip-base64') {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot open compressed snapshots.');
    }
    bytes = await pipe(bytes, new DecompressionStream('gzip'));
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as SnapshotData;
};

export interface CreateSnapshotInput {
  name: string;
  data: SnapshotData;
  userId: string;
  userName: string;
}

export const createSnapshot = async ({
  name,
  data,
  userId,
  userName,
}: CreateSnapshotInput): Promise<SnapshotMeta> => {
  const { encoding, payload } = await encode(data);
  const summary = summarizeSnapshot(data);
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert({
      name,
      created_by: userId,
      created_by_name: userName,
      summary,
      encoding,
      payload,
    })
    .select('id, name, created_at, created_by_name, summary')
    .single();
  if (error || !row) throw explain(error?.message ?? 'Could not save your violations.');
  return toMeta(row as MetaRow);
};

export const listSnapshots = async (): Promise<SnapshotMeta[]> => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, created_at, created_by_name, summary')
    .order('created_at', { ascending: false });
  if (error) throw explain(error.message);
  return ((data ?? []) as MetaRow[]).map(toMeta);
};

export const fetchSnapshot = async (
  id: string,
): Promise<{ meta: SnapshotMeta; data: SnapshotData }> => {
  const { data: row, error } = await supabase
    .from(TABLE)
    .select('id, name, created_at, created_by_name, summary, encoding, payload')
    .eq('id', id)
    .maybeSingle();
  if (error) throw explain(error.message);
  if (!row) throw new Error('This snapshot no longer exists.');
  const r = row as MetaRow & { encoding: string; payload: string };
  return { meta: toMeta(r), data: await decode(r.encoding, r.payload) };
};

export const deleteSnapshot = async (id: string): Promise<void> => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw explain(error.message);
};
