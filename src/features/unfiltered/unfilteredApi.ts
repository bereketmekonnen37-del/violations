import { supabase } from '../../lib/supabaseClient';
import type {
  ContinuousSource,
  DriverBlock,
  OverspeedEvent,
  UnfilteredFile,
  UnfilteredFileKind,
} from '../../types';

interface SpeedEventRow {
  id: string;
  driver_block_id: string;
  start_time: string;
  end_time: string;
  duration: string;
  top_speed: string;
  overspeed_position: string;
  location: string;
  gps_coords: string;
  remarks: string;
  event_type: string;
  transporter: string;
}

interface DriverBlockRow {
  id: string;
  driver_name: string;
  vid: string;
  plate: string;
  period: string;
  transporter: string;
  source: ContinuousSource | null;
  speed_events: SpeedEventRow[];
}

interface UploadBatchRow {
  id: string;
  title: string;
  uploaded_at: string;
  uploader_id: string;
  source: ContinuousSource | null;
  file_type: string;
  total_count: number;
  profiles: { name: string } | null;
  driver_blocks: DriverBlockRow[];
}

const toEvent = (row: SpeedEventRow): OverspeedEvent => ({
  id: row.id,
  start: row.start_time,
  end: row.end_time,
  duration: row.duration,
  topSpeed: row.top_speed,
  overspeedPosition: row.overspeed_position,
  location: row.location,
  gpsCoords: row.gps_coords,
  remarks: row.remarks,
  eventType: row.event_type,
  transporter: row.transporter,
});

const toBlock = (row: DriverBlockRow): DriverBlock => ({
  id: row.id,
  driverName: row.driver_name,
  vid: row.vid,
  plate: row.plate,
  period: row.period,
  transporter: row.transporter,
  source: row.source ?? 'mela',
  events: (row.speed_events ?? []).map(toEvent),
});

const toFile = (row: UploadBatchRow): UnfilteredFile => ({
  id: row.id,
  title: row.title,
  uploadDate: row.uploaded_at,
  uploaderId: row.uploader_id,
  uploaderName: row.profiles?.name ?? '',
  fileType: (row.file_type || 'csv') as UnfilteredFileKind,
  source: row.source ?? 'mela',
  drivers: (row.driver_blocks ?? []).map(toBlock),
  totalEvents: row.total_count,
});

export const fetchUnfilteredFiles = async (): Promise<UnfilteredFile[]> => {
  const { data, error } = await supabase
    .from('upload_batches')
    .select(
      `id, title, uploaded_at, uploader_id, source, file_type, total_count,
       profiles ( name ),
       driver_blocks (
         id, driver_name, vid, plate, period, transporter, source,
         speed_events ( id, driver_block_id, start_time, end_time, duration, top_speed, overspeed_position, location, gps_coords, remarks, event_type, transporter )
       )`,
    )
    .eq('kind', 'speed')
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as UploadBatchRow[]).map(toFile);
};

export interface CreateUnfilteredBatchInput {
  title: string;
  fileType: UnfilteredFileKind;
  source: ContinuousSource;
  drivers: DriverBlock[];
  uploaderId: string;
  uploaderName: string;
}

export const createUnfilteredBatch = async ({
  title,
  fileType,
  source,
  drivers,
  uploaderId,
  uploaderName,
}: CreateUnfilteredBatchInput): Promise<UnfilteredFile> => {
  const totalEvents = drivers.reduce((s, d) => s + d.events.length, 0);

  const { data: batch, error: batchError } = await supabase
    .from('upload_batches')
    .insert({
      kind: 'speed',
      title,
      source,
      file_type: fileType,
      uploader_id: uploaderId,
      total_count: totalEvents,
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

    const eventsPayload = drivers.flatMap((d, i) =>
      d.events.map((e) => ({
        driver_block_id: blockRows[i].id,
        start_time: e.start,
        end_time: e.end,
        duration: e.duration,
        top_speed: e.topSpeed,
        overspeed_position: e.overspeedPosition,
        location: e.location,
        gps_coords: e.gpsCoords,
        remarks: e.remarks,
        event_type: e.eventType,
        transporter: e.transporter,
      })),
    );

    let eventRows: SpeedEventRow[] = [];
    if (eventsPayload.length > 0) {
      const { data, error } = await supabase
        .from('speed_events')
        .insert(eventsPayload)
        .select(
          'id, driver_block_id, start_time, end_time, duration, top_speed, overspeed_position, location, gps_coords, remarks, event_type, transporter',
        );
      if (error || !data) {
        throw new Error(error?.message ?? 'Could not save overspeed events.');
      }
      eventRows = data as SpeedEventRow[];
    }

    const eventsByBlock = new Map<string, OverspeedEvent[]>();
    eventRows.forEach((row) => {
      const list = eventsByBlock.get(row.driver_block_id) ?? [];
      list.push(toEvent(row));
      eventsByBlock.set(row.driver_block_id, list);
    });

    const resultDrivers: DriverBlock[] = drivers.map((d, i) => ({
      id: blockRows[i].id,
      driverName: d.driverName,
      vid: d.vid,
      plate: d.plate,
      period: d.period,
      transporter: d.transporter,
      source: d.source,
      events: eventsByBlock.get(blockRows[i].id) ?? [],
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
      totalEvents,
    };
  } catch (e) {
    await supabase.from('upload_batches').delete().eq('id', batchId);
    throw e;
  }
};

export const deleteUnfilteredBatch = async (id: string): Promise<void> => {
  const { error } = await supabase.from('upload_batches').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
