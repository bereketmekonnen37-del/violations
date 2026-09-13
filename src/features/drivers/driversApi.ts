import { supabase } from '../../lib/supabaseClient';
import type { DriverRecord, UnfilteredFileKind } from '../../types';

export interface DriverRosterPayload {
  period: string;
  uploadedAt: string | null;
  uploaderId: string | null;
  uploaderName: string | null;
  fileName: string | null;
  fileType: UnfilteredFileKind | null;
  records: DriverRecord[];
}

interface RosterMetaRow {
  id: string;
  period: string;
  uploaded_at: string | null;
  uploader_id: string | null;
  file_name: string | null;
  file_type: string | null;
  profiles: { name: string } | null;
}

const EMPTY_ROSTER: DriverRosterPayload = {
  period: '',
  uploadedAt: null,
  uploaderId: null,
  uploaderName: null,
  fileName: null,
  fileType: null,
  records: [],
};

export const fetchDriverRoster = async (): Promise<DriverRosterPayload> => {
  const [{ data: meta, error: metaError }, { data: records, error: recordsError }] =
    await Promise.all([
      supabase
        .from('driver_roster_meta')
        .select('id, period, uploaded_at, uploader_id, file_name, file_type, profiles ( name )')
        .eq('id', 'default')
        .maybeSingle(),
      supabase.from('driver_roster_records').select('id, vid, driver_name, transporter'),
    ]);
  if (metaError) throw new Error(metaError.message);
  if (recordsError) throw new Error(recordsError.message);

  const rows: DriverRecord[] = (records ?? []).map((r) => ({
    id: r.id as string,
    vid: r.vid as string,
    driverName: r.driver_name as string,
    transporter: r.transporter as string,
  }));

  if (!meta) return { ...EMPTY_ROSTER, records: rows };

  const m = meta as unknown as RosterMetaRow;
  return {
    period: m.period ?? '',
    uploadedAt: m.uploaded_at,
    uploaderId: m.uploader_id,
    uploaderName: m.profiles?.name ?? null,
    fileName: m.file_name,
    fileType: (m.file_type as UnfilteredFileKind) ?? null,
    records: rows,
  };
};

const CHUNK_SIZE = 500;

export interface ReplaceDriverRosterInput {
  period: string;
  uploaderId: string;
  uploaderName: string;
  fileName: string;
  fileType: UnfilteredFileKind;
  records: DriverRecord[];
}

export const replaceDriverRosterRemote = async ({
  period,
  uploaderId,
  fileName,
  fileType,
  records,
}: ReplaceDriverRosterInput): Promise<string> => {
  const { error: deleteError } = await supabase
    .from('driver_roster_records')
    .delete()
    .not('id', 'is', null);
  if (deleteError) throw new Error(deleteError.message);

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE).map((r) => ({
      vid: r.vid,
      driver_name: r.driverName,
      transporter: r.transporter,
    }));
    if (chunk.length === 0) continue;
    const { error } = await supabase.from('driver_roster_records').insert(chunk);
    if (error) throw new Error(error.message);
  }

  const uploadedAt = new Date().toISOString();
  const { error: metaError } = await supabase.from('driver_roster_meta').upsert({
    id: 'default',
    period,
    uploaded_at: uploadedAt,
    uploader_id: uploaderId,
    file_name: fileName,
    file_type: fileType,
  });
  if (metaError) throw new Error(metaError.message);

  return uploadedAt;
};

export const clearDriverRosterRemote = async (): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('driver_roster_records')
    .delete()
    .not('id', 'is', null);
  if (deleteError) throw new Error(deleteError.message);
  const { error: metaError } = await supabase.from('driver_roster_meta').upsert({
    id: 'default',
    period: '',
    uploaded_at: null,
    uploader_id: null,
    file_name: null,
    file_type: null,
  });
  if (metaError) throw new Error(metaError.message);
};

/** One-time bulk seed used when Supabase has no roster yet but the current
 *  browser has a pre-existing local one. */
export const seedDriverRoster = async (
  payload: DriverRosterPayload,
): Promise<void> => {
  if (payload.records.length === 0 || !payload.uploaderId) return;
  await replaceDriverRosterRemote({
    period: payload.period,
    uploaderId: payload.uploaderId,
    uploaderName: payload.uploaderName ?? '',
    fileName: payload.fileName ?? 'local-import',
    fileType: payload.fileType ?? 'csv',
    records: payload.records,
  });
};

export interface DriverRecordInput {
  vid: string;
  driverName: string;
  transporter: string;
}

/** Insert a single driver row (the Drivers page's manual "Add" form). The
 *  row's id is server-generated, so the caller must dispatch to Redux with
 *  the id this returns rather than a client-generated one. */
export const insertDriverRecordRemote = async (
  input: DriverRecordInput,
): Promise<DriverRecord> => {
  const { data, error } = await supabase
    .from('driver_roster_records')
    .insert({
      vid: input.vid,
      driver_name: input.driverName,
      transporter: input.transporter,
    })
    .select('id, vid, driver_name, transporter')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not add the driver.');
  return {
    id: data.id as string,
    vid: data.vid as string,
    driverName: data.driver_name as string,
    transporter: data.transporter as string,
  };
};

export const updateDriverRecordRemote = async (
  id: string,
  input: DriverRecordInput,
): Promise<void> => {
  const { error } = await supabase
    .from('driver_roster_records')
    .update({
      vid: input.vid,
      driver_name: input.driverName,
      transporter: input.transporter,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
};

export const deleteDriverRecordRemote = async (id: string): Promise<void> => {
  const { error } = await supabase.from('driver_roster_records').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
