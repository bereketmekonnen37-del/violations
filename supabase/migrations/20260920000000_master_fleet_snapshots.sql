-- ─────────────────────────────────────────────────────────────────
-- Master Fleet snapshots: a boss saves the exact Master Fleet data
-- (ranking + Speed / Nights / Continuous / Filtered tabs + the rules
-- that produced it) into a named folder, then opens it later as an
-- analytics page. The heavy data lives in `payload` (gzip + base64
-- JSON); `summary` is a small jsonb so the folder list stays fast.
-- ─────────────────────────────────────────────────────────────────

create table public.master_fleet_snapshots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles (id),
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  summary jsonb not null default '{}'::jsonb,
  encoding text not null default 'gzip-base64',
  payload text not null
);

create index master_fleet_snapshots_created_idx
  on public.master_fleet_snapshots (created_at desc);

alter table public.master_fleet_snapshots enable row level security;

create policy "master_fleet_snapshots_boss_all"
  on public.master_fleet_snapshots for all
  using (public.current_role() = 'boss')
  with check (public.current_role() = 'boss');
