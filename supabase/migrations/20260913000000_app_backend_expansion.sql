-- ─────────────────────────────────────────────────────────────────
-- Backend expansion: shared Rules, Master Fleet recommended-action
-- status, the monthly Drivers roster, and the legacy Filtered
-- Violations upload flow all move from per-browser localStorage to
-- Supabase, so every boss/staff session sees the same data. Also
-- adds a profile avatar column so photos sync across devices.
-- ─────────────────────────────────────────────────────────────────

-- ── Profile avatar ──────────────────────────────────────────────

alter table public.profiles add column if not exists avatar_url text;

-- ── App rules (single shared row, boss-editable) ────────────────

create table public.app_rules (
  id text primary key default 'default',
  thresholds jsonb not null default '{"speed":300,"nights":1800,"continuous":14400}'::jsonb,
  allowed_vids jsonb not null default '{"speed":[],"nights":[],"continuous":[]}'::jsonb,
  allowed_locations jsonb not null default '{"speed":[],"nights":[],"continuous":[]}'::jsonb,
  max_duration_seconds integer,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.app_rules enable row level security;

create policy "app_rules_select_authenticated"
  on public.app_rules for select
  using (auth.uid() is not null);

create policy "app_rules_write_boss"
  on public.app_rules for all
  using (public.current_role() = 'boss')
  with check (public.current_role() = 'boss');

-- ── Master Fleet recommended-action status ──────────────────────

create table public.master_fleet_status (
  vid text primary key,
  action text not null check (action in ('refresher', 'engaged')),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.master_fleet_status enable row level security;

create policy "master_fleet_status_select_authenticated"
  on public.master_fleet_status for select
  using (auth.uid() is not null);

create policy "master_fleet_status_write_authenticated"
  on public.master_fleet_status for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── Drivers monthly roster (single active snapshot) ─────────────

create table public.driver_roster_meta (
  id text primary key default 'default',
  period text not null default '',
  uploaded_at timestamptz,
  uploader_id uuid references public.profiles (id),
  file_name text,
  file_type text
);

alter table public.driver_roster_meta enable row level security;

create policy "driver_roster_meta_select_authenticated"
  on public.driver_roster_meta for select
  using (auth.uid() is not null);

create policy "driver_roster_meta_write_boss"
  on public.driver_roster_meta for all
  using (public.current_role() = 'boss')
  with check (public.current_role() = 'boss');

create table public.driver_roster_records (
  id uuid primary key default gen_random_uuid(),
  vid text not null default '',
  driver_name text not null default '',
  transporter text not null default ''
);

create index driver_roster_records_vid_idx on public.driver_roster_records (vid);

alter table public.driver_roster_records enable row level security;

create policy "driver_roster_records_select_authenticated"
  on public.driver_roster_records for select
  using (auth.uid() is not null);

create policy "driver_roster_records_write_boss"
  on public.driver_roster_records for all
  using (public.current_role() = 'boss')
  with check (public.current_role() = 'boss');

-- ── Legacy "Filtered Violations" upload flow ─────────────────────

create table public.violation_files (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  uploaded_at timestamptz not null default now(),
  file_type text not null default 'csv',
  uploader_id uuid not null references public.profiles (id),
  row_count integer not null default 0
);

create index violation_files_uploader_idx on public.violation_files (uploader_id);

alter table public.violation_files enable row level security;

create policy "violation_files_select_authenticated"
  on public.violation_files for select
  using (auth.uid() is not null);

create policy "violation_files_insert_own_or_boss"
  on public.violation_files for insert
  with check (uploader_id = auth.uid() or public.current_role() = 'boss');

create policy "violation_files_update_own_or_boss"
  on public.violation_files for update
  using (uploader_id = auth.uid() or public.current_role() = 'boss')
  with check (uploader_id = auth.uid() or public.current_role() = 'boss');

create policy "violation_files_delete_own_or_boss"
  on public.violation_files for delete
  using (uploader_id = auth.uid() or public.current_role() = 'boss');

create table public.violation_records (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.violation_files (id) on delete cascade,
  transporter text not null default '',
  driver_name text not null default '',
  vid text not null default '',
  date text not null default '',
  event_type text not null default '',
  location text not null default '',
  distance_km_hr text not null default '',
  duration text not null default '',
  gps_functionality text not null default 'unknown',
  remarks text not null default ''
);

create index violation_records_file_idx on public.violation_records (file_id);

alter table public.violation_records enable row level security;

create policy "violation_records_select_authenticated"
  on public.violation_records for select
  using (auth.uid() is not null);

create policy "violation_records_write_via_file_owner"
  on public.violation_records for all
  using (exists (
    select 1 from public.violation_files f
    where f.id = file_id
      and (f.uploader_id = auth.uid() or public.current_role() = 'boss')
  ))
  with check (exists (
    select 1 from public.violation_files f
    where f.id = file_id
      and (f.uploader_id = auth.uid() or public.current_role() = 'boss')
  ));
