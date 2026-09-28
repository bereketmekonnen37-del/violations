-- ─────────────────────────────────────────────────────────────────
-- Task Management
--   * boss creates tasks and assigns them to one or more staff
--   * each (task, staff) pair has its own lifecycle:
--       pending → awaiting_approval → completed
--       (boss may reject a submission, which sends it back to pending
--        with boss_response filled in)
--   * both boss (as brief) and staff (as proof) can attach files
--     under the private `task-attachments` storage bucket
-- ─────────────────────────────────────────────────────────────────

create type public.task_status as enum (
  'pending',
  'awaiting_approval',
  'completed',
  'rejected'
);

-- ── tables ───────────────────────────────────────────────────────

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  assigned_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- last time the boss opened the task drawer; used to compute their
  -- "unseen awaiting_approval" badge without a separate seen table
  seen_by_boss_at timestamptz
);

create index tasks_assigned_by_idx on public.tasks(assigned_by);
create index tasks_created_at_idx on public.tasks(created_at desc);

-- One row per (task, staff). Each staff member has their own status,
-- note, timestamps. Uniqueness prevents double-assignment.
create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  status public.task_status not null default 'pending',
  staff_note text not null default '',
  boss_response text not null default '',
  submitted_at timestamptz,
  completed_at timestamptz,
  -- last time the staff member opened the drawer; used for their
  -- "unseen new task" badge
  seen_by_staff_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, staff_id)
);

create index task_assignments_staff_idx on public.task_assignments(staff_id);
create index task_assignments_task_idx on public.task_assignments(task_id);
create index task_assignments_status_idx on public.task_assignments(status);

-- role = 'brief' → uploaded by boss when creating the task (assignment_id null)
-- role = 'proof' → uploaded by staff when submitting completion  (assignment_id set)
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  assignment_id uuid references public.task_assignments(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('brief', 'proof')),
  storage_path text not null,
  file_name text not null,
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  check (
    (role = 'brief' and assignment_id is null) or
    (role = 'proof' and assignment_id is not null)
  )
);

create index task_attachments_task_idx on public.task_attachments(task_id);
create index task_attachments_assignment_idx on public.task_attachments(assignment_id);

-- ── RLS: tasks ───────────────────────────────────────────────────

alter table public.tasks enable row level security;

create policy "tasks_boss_all"
  on public.tasks for all
  using (public.current_role() = 'boss')
  with check (public.current_role() = 'boss');

-- Staff can only see tasks they've been assigned to (via task_assignments).
create policy "tasks_staff_select_assigned"
  on public.tasks for select
  using (
    exists (
      select 1 from public.task_assignments a
      where a.task_id = tasks.id and a.staff_id = auth.uid()
    )
  );

-- ── RLS: task_assignments ───────────────────────────────────────

alter table public.task_assignments enable row level security;

create policy "task_assignments_boss_all"
  on public.task_assignments for all
  using (public.current_role() = 'boss')
  with check (public.current_role() = 'boss');

create policy "task_assignments_staff_select_own"
  on public.task_assignments for select
  using (staff_id = auth.uid());

-- Staff can update their own assignment row. We can't easily restrict
-- which columns are touched from RLS, so we rely on the client to only
-- change staff_note / status / submitted_at / seen_by_staff_at. A stricter
-- solution is a SECURITY DEFINER RPC — worth adding later if abuse becomes
-- a concern.
create policy "task_assignments_staff_update_own"
  on public.task_assignments for update
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

-- ── RLS: task_attachments ───────────────────────────────────────

alter table public.task_attachments enable row level security;

create policy "task_attachments_boss_all"
  on public.task_attachments for all
  using (public.current_role() = 'boss')
  with check (public.current_role() = 'boss');

-- Staff can read all attachments on tasks they're assigned to (they
-- need to see the brief the boss uploaded, plus proofs on their own
-- assignments).
create policy "task_attachments_staff_select_assigned"
  on public.task_attachments for select
  using (
    exists (
      select 1 from public.task_assignments a
      where a.task_id = task_attachments.task_id and a.staff_id = auth.uid()
    )
  );

-- Staff can insert only 'proof' rows tied to their own assignment.
create policy "task_attachments_staff_insert_proof"
  on public.task_attachments for insert
  with check (
    role = 'proof'
    and uploaded_by = auth.uid()
    and exists (
      select 1 from public.task_assignments a
      where a.id = task_attachments.assignment_id
        and a.staff_id = auth.uid()
    )
  );

-- ── storage bucket for attachments ───────────────────────────────
-- Private bucket, downloads require signed URLs. Path layout:
--   <task_id>/brief/<uuid>-<filename>
--   <task_id>/proof/<assignment_id>/<uuid>-<filename>

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

-- Read: any authenticated user whose profile role is boss, OR a staff
-- who is assigned to the task referenced by the first path segment.
create policy "task_attachments_bucket_read"
  on storage.objects for select
  using (
    bucket_id = 'task-attachments'
    and (
      public.current_role() = 'boss'
      or exists (
        select 1 from public.task_assignments a
        where a.staff_id = auth.uid()
          and a.task_id::text = split_part(name, '/', 1)
      )
    )
  );

-- Insert: boss can put anything under the bucket; staff can only put
-- files whose path starts with <task_id>/proof/<their assignment_id>/.
create policy "task_attachments_bucket_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'task-attachments'
    and (
      public.current_role() = 'boss'
      or exists (
        select 1 from public.task_assignments a
        where a.staff_id = auth.uid()
          and a.task_id::text = split_part(name, '/', 1)
          and split_part(name, '/', 2) = 'proof'
          and a.id::text = split_part(name, '/', 3)
      )
    )
  );

-- Delete: boss only. Staff cannot yank a proof once uploaded.
create policy "task_attachments_bucket_delete_boss"
  on storage.objects for delete
  using (
    bucket_id = 'task-attachments'
    and public.current_role() = 'boss'
  );
