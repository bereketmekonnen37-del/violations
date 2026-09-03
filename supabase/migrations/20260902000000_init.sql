-- ─────────────────────────────────────────────────────────────────
-- Foundation schema: boss/staff auth profiles + violation upload data
-- (speed / night / continuous), with row-level security so:
--   * any signed-in user (boss or staff) can read everything
--   * a user can only insert/modify rows they uploaded themselves
--   * a boss can additionally modify/delete anyone's rows
-- ─────────────────────────────────────────────────────────────────

create type public.user_role as enum ('boss', 'staff');
create type public.violation_source as enum ('mela', 'global');
create type public.violation_kind as enum ('speed', 'night', 'continuous');

-- ── Profiles (1:1 with auth.users) ─────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role public.user_role not null default 'staff',
  assigned_transporters text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- security definer + fixed search_path so this can be called from RLS
-- policies without recursively re-checking RLS on profiles itself.
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "profiles_select_own_or_boss"
  on public.profiles for select
  using (id = auth.uid() or public.current_role() = 'boss');

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_boss_manage"
  on public.profiles for all
  using (public.current_role() = 'boss')
  with check (public.current_role() = 'boss');

-- Auto-create a profile row whenever a new auth user is created.
-- Pass {"name": "...", "role": "boss"|"staff"} as user metadata when
-- creating the user (Dashboard "Add user" -> User Metadata, or the
-- signUp/admin.createUser `data` option) to set name/role at creation time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'staff')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Upload batches (one per file a staff/boss uploads) ─────────────

create table public.upload_batches (
  id uuid primary key default gen_random_uuid(),
  kind public.violation_kind not null,
  title text not null default '',
  source public.violation_source,
  uploader_id uuid not null references public.profiles (id),
  uploaded_at timestamptz not null default now(),
  total_count integer not null default 0
);

create index upload_batches_kind_idx on public.upload_batches (kind);
create index upload_batches_uploader_idx on public.upload_batches (uploader_id);

alter table public.upload_batches enable row level security;

create policy "batches_select_authenticated"
  on public.upload_batches for select
  using (auth.uid() is not null);

create policy "batches_insert_own"
  on public.upload_batches for insert
  with check (uploader_id = auth.uid());

create policy "batches_update_own_or_boss"
  on public.upload_batches for update
  using (uploader_id = auth.uid() or public.current_role() = 'boss')
  with check (uploader_id = auth.uid() or public.current_role() = 'boss');

create policy "batches_delete_own_or_boss"
  on public.upload_batches for delete
  using (uploader_id = auth.uid() or public.current_role() = 'boss');

-- ── Driver blocks (one per driver within a batch) ───────────────────

create table public.driver_blocks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.upload_batches (id) on delete cascade,
  driver_name text not null default '',
  vid text not null default '',
  plate text not null default '',
  period text not null default '',
  transporter text not null default '',
  source public.violation_source
);

create index driver_blocks_batch_idx on public.driver_blocks (batch_id);
create index driver_blocks_transporter_idx on public.driver_blocks (transporter);

alter table public.driver_blocks enable row level security;

create policy "driver_blocks_select_authenticated"
  on public.driver_blocks for select
  using (auth.uid() is not null);

create policy "driver_blocks_write_via_batch_owner"
  on public.driver_blocks for all
  using (exists (
    select 1 from public.upload_batches b
    where b.id = batch_id
      and (b.uploader_id = auth.uid() or public.current_role() = 'boss')
  ))
  with check (exists (
    select 1 from public.upload_batches b
    where b.id = batch_id
      and (b.uploader_id = auth.uid() or public.current_role() = 'boss')
  ));

-- ── Speed (unfiltered/overspeed) events ─────────────────────────────

create table public.speed_events (
  id uuid primary key default gen_random_uuid(),
  driver_block_id uuid not null references public.driver_blocks (id) on delete cascade,
  start_time text not null default '',
  end_time text not null default '',
  duration text not null default '',
  top_speed text not null default '',
  overspeed_position text not null default '',
  location text not null default '',
  gps_coords text not null default '',
  remarks text not null default '',
  event_type text not null default '',
  transporter text not null default ''
);

create index speed_events_driver_block_idx on public.speed_events (driver_block_id);

-- ── Night driving rows ───────────────────────────────────────────────

create table public.night_rows (
  id uuid primary key default gen_random_uuid(),
  driver_block_id uuid not null references public.driver_blocks (id) on delete cascade,
  time_a text not null default '',
  position_a text not null default '',
  time_b text not null default '',
  position_b text not null default '',
  duration text not null default '',
  length text not null default '',
  average_speed text,
  max_speed text
);

create index night_rows_driver_block_idx on public.night_rows (driver_block_id);

-- ── Continuous driving rows ──────────────────────────────────────────

create table public.continuous_rows (
  id uuid primary key default gen_random_uuid(),
  driver_block_id uuid not null references public.driver_blocks (id) on delete cascade,
  time_a text not null default '',
  position_a text not null default '',
  time_b text not null default '',
  position_b text not null default '',
  duration text not null default '',
  length text not null default ''
);

create index continuous_rows_driver_block_idx on public.continuous_rows (driver_block_id);

-- Shared RLS shape for all three "rows/events" child tables: readable by
-- any signed-in user, writable only through the batch owner (or boss).
alter table public.speed_events enable row level security;
alter table public.night_rows enable row level security;
alter table public.continuous_rows enable row level security;

create policy "speed_events_select_authenticated"
  on public.speed_events for select using (auth.uid() is not null);
create policy "speed_events_write_via_batch_owner"
  on public.speed_events for all
  using (exists (
    select 1 from public.driver_blocks db
    join public.upload_batches b on b.id = db.batch_id
    where db.id = driver_block_id
      and (b.uploader_id = auth.uid() or public.current_role() = 'boss')
  ))
  with check (exists (
    select 1 from public.driver_blocks db
    join public.upload_batches b on b.id = db.batch_id
    where db.id = driver_block_id
      and (b.uploader_id = auth.uid() or public.current_role() = 'boss')
  ));

create policy "night_rows_select_authenticated"
  on public.night_rows for select using (auth.uid() is not null);
create policy "night_rows_write_via_batch_owner"
  on public.night_rows for all
  using (exists (
    select 1 from public.driver_blocks db
    join public.upload_batches b on b.id = db.batch_id
    where db.id = driver_block_id
      and (b.uploader_id = auth.uid() or public.current_role() = 'boss')
  ))
  with check (exists (
    select 1 from public.driver_blocks db
    join public.upload_batches b on b.id = db.batch_id
    where db.id = driver_block_id
      and (b.uploader_id = auth.uid() or public.current_role() = 'boss')
  ));

create policy "continuous_rows_select_authenticated"
  on public.continuous_rows for select using (auth.uid() is not null);
create policy "continuous_rows_write_via_batch_owner"
  on public.continuous_rows for all
  using (exists (
    select 1 from public.driver_blocks db
    join public.upload_batches b on b.id = db.batch_id
    where db.id = driver_block_id
      and (b.uploader_id = auth.uid() or public.current_role() = 'boss')
  ))
  with check (exists (
    select 1 from public.driver_blocks db
    join public.upload_batches b on b.id = db.batch_id
    where db.id = driver_block_id
      and (b.uploader_id = auth.uid() or public.current_role() = 'boss')
  ));
