import { supabase } from '../../lib/supabaseClient';
import type { UserRole } from '../../types';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  assignedTransporters: string[];
  uploads: {
    speed: number;
    nights: number;
    continuous: number;
    violations: number;
    total: number;
  };
}

export type AdminUploadKind = 'speed' | 'night' | 'continuous' | 'violation';

export interface AdminUploadRecord {
  id: string;
  kind: AdminUploadKind;
  title: string;
  uploadedAt: string;
  uploaderId: string;
  uploaderName: string;
  uploaderEmail: string;
  uploaderRole: UserRole;
  rowCount: number;
  source: string | null;
  fileType: string | null;
}

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  assigned_transporters: string[] | null;
}

interface UploadBatchRow {
  id: string;
  kind: 'speed' | 'night' | 'continuous';
  title: string;
  source: 'mela' | 'global' | null;
  uploader_id: string;
  uploaded_at: string;
  total_count: number;
}

interface ViolationFileRow {
  id: string;
  title: string;
  uploaded_at: string;
  file_type: string;
  uploader_id: string;
  row_count: number;
}

/** All profiles (boss + staff) with their per-kind upload counts. */
export const fetchAdminUsers = async (): Promise<AdminUser[]> => {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at, assigned_transporters')
    .in('role', ['boss', 'staff'])
    .order('created_at', { ascending: false });

  if (profilesError) throw new Error(profilesError.message);

  const rows = (profiles ?? []) as ProfileRow[];
  if (rows.length === 0) return [];
  const userIds = rows.map((r) => r.id);

  const [batchesRes, violationsRes] = await Promise.all([
    supabase
      .from('upload_batches')
      .select('uploader_id, kind')
      .in('uploader_id', userIds),
    supabase
      .from('violation_files')
      .select('uploader_id')
      .in('uploader_id', userIds),
  ]);

  if (batchesRes.error) throw new Error(batchesRes.error.message);
  if (violationsRes.error) throw new Error(violationsRes.error.message);

  const speedMap = new Map<string, number>();
  const nightMap = new Map<string, number>();
  const continuousMap = new Map<string, number>();
  for (const b of (batchesRes.data ?? []) as Pick<UploadBatchRow, 'uploader_id' | 'kind'>[]) {
    const map = b.kind === 'speed' ? speedMap : b.kind === 'night' ? nightMap : continuousMap;
    map.set(b.uploader_id, (map.get(b.uploader_id) ?? 0) + 1);
  }
  const violationMap = new Map<string, number>();
  for (const v of (violationsRes.data ?? []) as Pick<ViolationFileRow, 'uploader_id'>[]) {
    violationMap.set(v.uploader_id, (violationMap.get(v.uploader_id) ?? 0) + 1);
  }

  return rows.map((r) => {
    const speed = speedMap.get(r.id) ?? 0;
    const nights = nightMap.get(r.id) ?? 0;
    const continuous = continuousMap.get(r.id) ?? 0;
    const violations = violationMap.get(r.id) ?? 0;
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      createdAt: r.created_at,
      assignedTransporters: r.assigned_transporters ?? [],
      uploads: {
        speed,
        nights,
        continuous,
        violations,
        total: speed + nights + continuous + violations,
      },
    };
  });
};

/** @deprecated use fetchAdminUsers */
export const fetchAdminDashboard = fetchAdminUsers;

/** Every upload record (all four kinds) joined with uploader profile. */
export const fetchAdminUploads = async (): Promise<AdminUploadRecord[]> => {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .in('role', ['boss', 'staff']);
  if (profilesError) throw new Error(profilesError.message);
  const profileMap = new Map<string, ProfileRow>();
  for (const p of (profiles ?? []) as ProfileRow[]) profileMap.set(p.id, p);

  const [batchesRes, violationsRes] = await Promise.all([
    supabase
      .from('upload_batches')
      .select('id, kind, title, source, uploader_id, uploaded_at, total_count')
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('violation_files')
      .select('id, title, uploaded_at, file_type, uploader_id, row_count')
      .order('uploaded_at', { ascending: false }),
  ]);

  if (batchesRes.error) throw new Error(batchesRes.error.message);
  if (violationsRes.error) throw new Error(violationsRes.error.message);

  const toRecord = (
    id: string,
    kind: AdminUploadKind,
    title: string,
    uploaded_at: string,
    uploader_id: string,
    rowCount: number,
    source: string | null,
    fileType: string | null,
  ): AdminUploadRecord => {
    const p = profileMap.get(uploader_id);
    return {
      id,
      kind,
      title: title || '(untitled)',
      uploadedAt: uploaded_at,
      uploaderId: uploader_id,
      uploaderName: p?.name ?? 'Unknown',
      uploaderEmail: p?.email ?? '—',
      uploaderRole: p?.role ?? 'staff',
      rowCount,
      source,
      fileType,
    };
  };

  const batches = ((batchesRes.data ?? []) as UploadBatchRow[]).map((b) =>
    toRecord(
      b.id,
      b.kind === 'night' ? 'night' : b.kind,
      b.title,
      b.uploaded_at,
      b.uploader_id,
      b.total_count,
      b.source,
      null,
    ),
  );
  const violations = ((violationsRes.data ?? []) as ViolationFileRow[]).map((v) =>
    toRecord(v.id, 'violation', v.title, v.uploaded_at, v.uploader_id, v.row_count, null, v.file_type),
  );

  return [...batches, ...violations].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
};
