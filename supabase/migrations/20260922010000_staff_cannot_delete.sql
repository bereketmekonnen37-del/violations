-- ─────────────────────────────────────────────────────────────────
-- Staff (both legacy and transporter-scoped) are responsible for
-- uploading Speed / Nights / Continuous files — nothing else. Only the
-- boss can now delete uploaded batches, filtered violation files and
-- the master-fleet snapshots. Insert stays exactly as before so staff
-- can still upload.
--
-- Read policies are untouched: staff CAN read rows (for the raw upload
-- pages and boss-view screens they get when they have assigned
-- transporters). The UI is what removes the "your uploads" list and
-- delete controls from legacy staff — the DB is just a second line of
-- defence in case the UI is bypassed.
-- ─────────────────────────────────────────────────────────────────

drop policy if exists "batches_delete_own_or_boss" on public.upload_batches;
create policy "batches_delete_boss"
  on public.upload_batches for delete
  using (public.current_role() = 'boss');

drop policy if exists "violation_files_delete_own_or_boss" on public.violation_files;
create policy "violation_files_delete_boss"
  on public.violation_files for delete
  using (public.current_role() = 'boss');

-- Master-fleet snapshots were already boss-only for every operation
-- via `master_fleet_snapshots_boss_all`; no change needed there.
