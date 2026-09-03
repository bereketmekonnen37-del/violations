import { supabase } from '../../lib/supabaseClient';
import type {
  ContinuousDriverBlock,
  ContinuousRow,
  ContinuousSource,
  UnfilteredContinuousFile,
  UnfilteredFileKind,
} from '../../types';

interface ContinuousRowRow {
  id: string;
  driver_block_id: string;
  time_a: string;
  position_a: string;
  time_b: string;
  position_b: string;
  duration: string;
  length: string;
}

interface ContinuousDriverBlockRow {
  id: string;
  driver_name: string;
  vid: string;
  plate: string;
  period: string;
  transporter: string;
  source: ContinuousSource | null;
  continuous_rows: ContinuousRowRow[];
}

interface ContinuousBatchRow {
  id: string;
  title: string;
  uploaded_at: string;
  uploader_id: string;
  source: ContinuousSource | null;
  file_type: string;
  total_count: number;
  profiles: { name: string } | null;
  driver_blocks: ContinuousDriverBlockRow[];
}

const toRow = (row: ContinuousRowRow): ContinuousRow => ({
  id: row.id,
  timeA: row.time_a,
  positionA: row.position_a,
  timeB: row.time_b,
  positionB: row.position_b,
  duration: row.duration,
  length: row.length,
});

const toBlock = (row: ContinuousDriverBlockRow): ContinuousDriverBlock => ({
  id: row.id,
  driverName: row.driver_name,
  vid: row.vid,
  plate: row.plate,
  period: row.period,
  transporter: row.transporter,
  source: row.source ?? 'mela',
  rows: (row.continuous_rows ?? []).map(toRow),
});

const toFile = (row: ContinuousBatchRow): UnfilteredContinuousFile => ({
  id: row.id,
  title: row.title,
  uploadDate: row.uploaded_at,
  uploaderId: row.uploader_id,
  uploaderName: row.profiles?.name ?? '',
  fileType: (row.file_type || 'csv') as UnfilteredFileKind,
  source: row.source ?? 'mela',
  drivers: (row.driver_blocks ?? []).map(toBlock),
  totalRows: row.total_count,
});

export const fetchContinuousFiles = async (): Promise<UnfilteredContinuousFile[]> => {
  const { data, error } = await supabase
    .from('upload_batches')
    .select(
      `id, title, uploaded_at, uploader_id, source, file_type, total_count,
       profiles ( name ),
       driver_blocks (
         id, driver_name, vid, plate, period, transporter, source,
         continuous_rows ( id, driver_block_id, time_a, position_a, time_b, position_b, duration, length )
       )`,
    )
    .eq('kind', 'continuous')
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ContinuousBatchRow[]).map(toFile);
};

export interface CreateContinuousBatchInput {
  title: string;
  fileType: UnfilteredFileKind;
  source: ContinuousSource;
  drivers: ContinuousDriverBlock[];
  uploaderId: string;
  uploaderName: string;
}

export const createContinuousBatch = async ({
  title,
  fileType,
  source,
  drivers,
  uploaderId,
  uploaderName,
}: CreateContinuousBatchInput): Promise<UnfilteredContinuousFile> => {
  const totalRows = drivers.reduce((s, d) => s + d.rows.length, 0);

  const { data: batch, error: batchError } = await supabase
    .from('upload_batches')
    .insert({
      kind: 'continuous',
      title,
      source,
      file_type: fileType,
      uploader_id: uploaderId,
      total_count: totalRows,
    })
    .select('id, uploaded_at')
    .single();
  if (batchError || !batch) {
    throw new Error(batchError?.message ?? 'Could not create the upload batch.');
  }
  const batchId = batch.id as string;

  try {
    let blockRows: { id: string }[] = [];
    if (drivers.length > 0) {
      const { data, error } = await supabase
        .from('driver_blocks')
        .insert(
          drivers.map((d) => ({
            batch_id: batchId,
            driver_name: d.driverName,
            vid: d.vid,
            plate: d.plate,
            period: d.period,
            transporter: d.transporter,
            source: d.source,
          })),
        )
        .select('id');
      if (error || !data) {
        throw new Error(error?.message ?? 'Could not save driver blocks.');
      }
      blockRows = data;
    }

    const rowsPayload = drivers.flatMap((d, i) =>
      d.rows.map((r) => ({
        driver_block_id: blockRows[i].id,
        time_a: r.timeA,
        position_a: r.positionA,
        time_b: r.timeB,
        position_b: r.positionB,
        duration: r.duration,
        length: r.length,
      })),
    );

    let continuousRowRows: ContinuousRowRow[] = [];
    if (rowsPayload.length > 0) {
      const { data, error } = await supabase
        .from('continuous_rows')
        .insert(rowsPayload)
        .select('id, driver_block_id, time_a, position_a, time_b, position_b, duration, length');
      if (error || !data) {
        throw new Error(error?.message ?? 'Could not save continuous rows.');
      }
      continuousRowRows = data as ContinuousRowRow[];
    }

    const rowsByBlock = new Map<string, ContinuousRow[]>();
    continuousRowRows.forEach((row) => {
      const list = rowsByBlock.get(row.driver_block_id) ?? [];
      list.push(toRow(row));
      rowsByBlock.set(row.driver_block_id, list);
    });

    const resultDrivers: ContinuousDriverBlock[] = drivers.map((d, i) => ({
      id: blockRows[i].id,
      driverName: d.driverName,
      vid: d.vid,
      plate: d.plate,
      period: d.period,
      transporter: d.transporter,
      source: d.source,
      rows: rowsByBlock.get(blockRows[i].id) ?? [],
    }));

    return {
      id: batchId,
      title,
      uploadDate: batch.uploaded_at as string,
      uploaderId,
      uploaderName,
      fileType,
      source,
      drivers: resultDrivers,
      totalRows,
    };
  } catch (e) {
    await supabase.from('upload_batches').delete().eq('id', batchId);
    throw e;
  }
};

export const deleteContinuousBatch = async (id: string): Promise<void> => {
  const { error } = await supabase.from('upload_batches').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
