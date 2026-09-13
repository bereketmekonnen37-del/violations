import { supabase } from '../../lib/supabaseClient';
import type { FileKind, ViolationFile, ViolationRecord } from '../../types';

interface ViolationRecordRow {
  id: string;
  transporter: string;
  driver_name: string;
  vid: string;
  date: string;
  event_type: string;
  location: string;
  distance_km_hr: string;
  duration: string;
  gps_functionality: string;
  remarks: string;
}

interface ViolationFileRow {
  id: string;
  title: string;
  uploaded_at: string;
  file_type: string;
  uploader_id: string;
  row_count: number;
  profiles: { name: string } | null;
  violation_records: ViolationRecordRow[];
}

const toRecord = (row: ViolationRecordRow): ViolationRecord => ({
  id: row.id,
  transporter: row.transporter,
  driverName: row.driver_name,
  vid: row.vid,
  date: row.date,
  eventType: row.event_type,
  location: row.location,
  distanceKmHr: row.distance_km_hr,
  duration: row.duration,
  gpsFunctionality: (row.gps_functionality as ViolationRecord['gpsFunctionality']) ?? 'unknown',
  remarks: row.remarks,
});

const toFile = (row: ViolationFileRow): ViolationFile => ({
  id: row.id,
  title: row.title,
  uploadDate: row.uploaded_at,
  fileType: (row.file_type as FileKind) ?? 'csv',
  uploaderId: row.uploader_id,
  uploaderName: row.profiles?.name ?? '',
  rowCount: row.row_count,
  records: (row.violation_records ?? []).map(toRecord),
});

export const fetchViolationFiles = async (): Promise<ViolationFile[]> => {
  const { data, error } = await supabase
    .from('violation_files')
    .select(
      `id, title, uploaded_at, file_type, uploader_id, row_count,
       profiles ( name ),
       violation_records ( id, transporter, driver_name, vid, date, event_type, location, distance_km_hr, duration, gps_functionality, remarks )`,
    )
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ViolationFileRow[]).map(toFile);
};

export interface CreateViolationFileInput {
  title: string;
  fileType: FileKind;
  uploaderId: string;
  uploaderName: string;
  records: ViolationRecord[];
}

export const createViolationFile = async ({
  title,
  fileType,
  uploaderId,
  uploaderName,
  records,
}: CreateViolationFileInput): Promise<ViolationFile> => {
  const { data: file, error: fileError } = await supabase
    .from('violation_files')
    .insert({
      title,
      file_type: fileType,
      uploader_id: uploaderId,
      row_count: records.length,
    })
    .select('id, uploaded_at')
    .single();
  if (fileError || !file) {
    throw new Error(fileError?.message ?? 'Could not create the violation file.');
  }
  const fileId = file.id as string;

  try {
    let savedRecords: ViolationRecord[] = [];
    if (records.length > 0) {
      const { data, error } = await supabase
        .from('violation_records')
        .insert(
          records.map((r) => ({
            file_id: fileId,
            transporter: r.transporter,
            driver_name: r.driverName,
            vid: r.vid,
            date: r.date,
            event_type: r.eventType,
            location: r.location,
            distance_km_hr: r.distanceKmHr,
            duration: r.duration,
            gps_functionality: r.gpsFunctionality,
            remarks: r.remarks,
          })),
        )
        .select(
          'id, transporter, driver_name, vid, date, event_type, location, distance_km_hr, duration, gps_functionality, remarks',
        );
      if (error || !data) {
        throw new Error(error?.message ?? 'Could not save violation records.');
      }
      savedRecords = (data as ViolationRecordRow[]).map(toRecord);
    }

    return {
      id: fileId,
      title,
      uploadDate: file.uploaded_at as string,
      fileType,
      uploaderId,
      uploaderName,
      rowCount: records.length,
      records: savedRecords,
    };
  } catch (e) {
    await supabase.from('violation_files').delete().eq('id', fileId);
    throw e;
  }
};

export const deleteViolationFile = async (id: string): Promise<void> => {
  const { error } = await supabase.from('violation_files').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
