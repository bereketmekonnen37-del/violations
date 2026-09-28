import { supabase } from '../../lib/supabaseClient';
import type {
  Task,
  TaskAssignment,
  TaskAttachment,
  TaskAttachmentRole,
  TaskStatus,
} from '../../types';

const BUCKET = 'task-attachments';

interface AttachmentRow {
  id: string;
  task_id: string;
  assignment_id: string | null;
  uploaded_by: string;
  role: TaskAttachmentRole;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | string | null;
  created_at: string;
}

interface AssignmentRow {
  id: string;
  task_id: string;
  staff_id: string;
  status: TaskStatus;
  staff_note: string | null;
  boss_response: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  seen_by_staff_at: string | null;
  created_at: string;
  staff: { name: string | null; email: string | null } | null;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  assigned_by: string;
  created_at: string;
  seen_by_boss_at: string | null;
  assigned_by_profile: { name: string | null } | null;
  assignments: AssignmentRow[];
  attachments: AttachmentRow[];
}

const toAttachment = (row: AttachmentRow): TaskAttachment => ({
  id: row.id,
  taskId: row.task_id,
  assignmentId: row.assignment_id,
  uploadedBy: row.uploaded_by,
  role: row.role,
  storagePath: row.storage_path,
  fileName: row.file_name,
  mimeType: row.mime_type ?? '',
  sizeBytes: Number(row.size_bytes ?? 0),
  createdAt: row.created_at,
});

const toAssignment = (
  row: AssignmentRow,
  proofs: TaskAttachment[],
): TaskAssignment => ({
  id: row.id,
  taskId: row.task_id,
  staffId: row.staff_id,
  staffName: row.staff?.name ?? '',
  staffEmail: row.staff?.email ?? '',
  status: row.status,
  staffNote: row.staff_note ?? '',
  bossResponse: row.boss_response ?? '',
  submittedAt: row.submitted_at,
  completedAt: row.completed_at,
  seenByStaffAt: row.seen_by_staff_at,
  createdAt: row.created_at,
  proofAttachments: proofs,
});

const toTask = (row: TaskRow): Task => {
  const attachments = (row.attachments ?? []).map(toAttachment);
  const briefs = attachments.filter((a) => a.role === 'brief');
  const proofsByAssignment = new Map<string, TaskAttachment[]>();
  for (const a of attachments) {
    if (a.role !== 'proof' || !a.assignmentId) continue;
    const list = proofsByAssignment.get(a.assignmentId) ?? [];
    list.push(a);
    proofsByAssignment.set(a.assignmentId, list);
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    assignedBy: row.assigned_by,
    assignedByName: row.assigned_by_profile?.name ?? '',
    createdAt: row.created_at,
    seenByBossAt: row.seen_by_boss_at,
    briefAttachments: briefs,
    assignments: (row.assignments ?? []).map((a) =>
      toAssignment(a, proofsByAssignment.get(a.id) ?? []),
    ),
  };
};

const SELECT = `
  id,
  title,
  description,
  assigned_by,
  created_at,
  seen_by_boss_at,
  assigned_by_profile:profiles!tasks_assigned_by_fkey ( name ),
  assignments:task_assignments (
    id, task_id, staff_id, status, staff_note, boss_response,
    submitted_at, completed_at, seen_by_staff_at, created_at,
    staff:profiles!task_assignments_staff_id_fkey ( name, email )
  ),
  attachments:task_attachments (
    id, task_id, assignment_id, uploaded_by, role,
    storage_path, file_name, mime_type, size_bytes, created_at
  )
` as const;

export const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(SELECT)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as TaskRow[]).map(toTask);
};

export interface CreateTaskInput {
  title: string;
  description: string;
  assigneeIds: string[];
  briefFiles: File[];
}

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data: taskRow, error: taskErr } = await supabase
    .from('tasks')
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      assigned_by: user.id,
    })
    .select('id')
    .single();
  if (taskErr || !taskRow) {
    throw new Error(taskErr?.message ?? 'Failed to create task');
  }
  const taskId = taskRow.id as string;

  const assignmentRows = input.assigneeIds.map((staffId) => ({
    task_id: taskId,
    staff_id: staffId,
  }));
  if (assignmentRows.length > 0) {
    const { error } = await supabase
      .from('task_assignments')
      .insert(assignmentRows);
    if (error) throw new Error(error.message);
  }

  if (input.briefFiles.length > 0) {
    await uploadAttachments(taskId, null, 'brief', input.briefFiles, user.id);
  }

  const [task] = await fetchTasksByIds([taskId]);
  if (!task) throw new Error('Task disappeared after insert.');
  return task;
};

const fetchTasksByIds = async (ids: string[]): Promise<Task[]> => {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('tasks')
    .select(SELECT)
    .in('id', ids);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as TaskRow[]).map(toTask);
};

const uploadAttachments = async (
  taskId: string,
  assignmentId: string | null,
  role: TaskAttachmentRole,
  files: File[],
  uploaderId: string,
): Promise<TaskAttachment[]> => {
  const inserted: TaskAttachment[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const uuid = crypto.randomUUID();
    const path =
      role === 'brief'
        ? `${taskId}/brief/${uuid}-${safeName}`
        : `${taskId}/proof/${assignmentId}/${uuid}-${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        assignment_id: assignmentId,
        uploaded_by: uploaderId,
        role,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || '',
        size_bytes: file.size,
      })
      .select(
        'id, task_id, assignment_id, uploaded_by, role, storage_path, file_name, mime_type, size_bytes, created_at',
      )
      .single();
    if (error || !data) {
      // best-effort cleanup so we don't leave orphan blobs
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error(error?.message ?? 'Failed to record attachment');
    }
    inserted.push(toAttachment(data as AttachmentRow));
  }
  return inserted;
};

export interface SubmitCompletionInput {
  assignmentId: string;
  taskId: string;
  note: string;
  proofFiles: File[];
}

export const submitCompletion = async (
  input: SubmitCompletionInput,
): Promise<Task> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  if (input.proofFiles.length > 0) {
    await uploadAttachments(
      input.taskId,
      input.assignmentId,
      'proof',
      input.proofFiles,
      user.id,
    );
  }

  const { error } = await supabase
    .from('task_assignments')
    .update({
      status: 'awaiting_approval',
      staff_note: input.note.trim(),
      submitted_at: new Date().toISOString(),
    })
    .eq('id', input.assignmentId);
  if (error) throw new Error(error.message);

  const [task] = await fetchTasksByIds([input.taskId]);
  if (!task) throw new Error('Task not found after submission.');
  return task;
};

export const approveAssignment = async (
  assignmentId: string,
  taskId: string,
): Promise<Task> => {
  const { error } = await supabase
    .from('task_assignments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      boss_response: '',
    })
    .eq('id', assignmentId);
  if (error) throw new Error(error.message);
  const [task] = await fetchTasksByIds([taskId]);
  if (!task) throw new Error('Task not found after approval.');
  return task;
};

export const rejectAssignment = async (
  assignmentId: string,
  taskId: string,
  reason: string,
): Promise<Task> => {
  const { error } = await supabase
    .from('task_assignments')
    .update({
      status: 'rejected',
      boss_response: reason.trim(),
      submitted_at: null,
    })
    .eq('id', assignmentId);
  if (error) throw new Error(error.message);
  const [task] = await fetchTasksByIds([taskId]);
  if (!task) throw new Error('Task not found after rejection.');
  return task;
};

export const reopenAssignment = async (
  assignmentId: string,
  taskId: string,
): Promise<Task> => {
  // Staff acknowledges a rejection and puts the task back to pending
  // so they can try again.
  const { error } = await supabase
    .from('task_assignments')
    .update({
      status: 'pending',
      submitted_at: null,
    })
    .eq('id', assignmentId);
  if (error) throw new Error(error.message);
  const [task] = await fetchTasksByIds([taskId]);
  if (!task) throw new Error('Task not found after reopen.');
  return task;
};

export const markSeenByBoss = async (): Promise<void> => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('tasks')
    .update({ seen_by_boss_at: now })
    .not('id', 'is', null);
  // ignore RLS-blocked rows (a staff user calling this shouldn't happen,
  // but if it does the .neq wipes nothing)
  if (error && !/permission/i.test(error.message)) {
    throw new Error(error.message);
  }
};

export const markSeenByStaff = async (assignmentIds: string[]): Promise<void> => {
  if (assignmentIds.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('task_assignments')
    .update({ seen_by_staff_at: now })
    .in('id', assignmentIds);
  if (error) throw new Error(error.message);
};

export const getAttachmentSignedUrl = async (
  storagePath: string,
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Failed to sign URL');
  }
  return data.signedUrl;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
};
