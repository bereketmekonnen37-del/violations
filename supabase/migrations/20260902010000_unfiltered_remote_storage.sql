-- ─────────────────────────────────────────────────────────────────
-- Wire the Unfiltered Speed/Nights/Continuous features up to real
-- cross-device storage (they previously lived only in redux-persist
-- local storage, so a boss on a different device saw nothing staff
-- had uploaded elsewhere).
-- ─────────────────────────────────────────────────────────────────

-- Track the original file extension (csv/xlsx/xls) — the app renders
-- this as a badge everywhere but it was never persisted.
alter table public.upload_batches
  add column file_type text not null default '';

-- profiles' own header comment says "any signed-in user (boss or
-- staff) can read everything", but its SELECT policy was stricter
-- than that (own row, or boss). Loosen it to match: reading a batch's
-- uploader name via an embedded `profiles(name)` select needs to work
-- for every uploader, not just the viewer's own row / when the viewer
-- is boss. Write policies (update/boss-manage) are unchanged.
drop policy "profiles_select_own_or_boss" on public.profiles;

create policy "profiles_select_authenticated"
  on public.profiles for select
  using (auth.uid() is not null);
