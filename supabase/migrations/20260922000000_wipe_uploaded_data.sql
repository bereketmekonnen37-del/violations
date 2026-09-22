-- ─────────────────────────────────────────────────────────────────
-- Reset every uploaded / derived violation dataset to zero.
--
-- Everything the boss and staff produce (Speed / Nights / Continuous
-- uploads, the legacy Filtered Violations file, the shared drivers
-- roster, saved master-fleet snapshots and the per-VID recommended-
-- action status) is wiped so the boss dashboard reads 0 / 0 / 0 across
-- the board — a clean starting point after a real-world data-import
-- mishap.
--
-- Auth users, profiles and the shared Rules row are intentionally kept
-- so nobody has to re-sign-in and the thresholds/whitelists survive.
-- ─────────────────────────────────────────────────────────────────

-- Child rows would cascade from their parents, but truncating them
-- explicitly is faster and makes the intent readable.
truncate table
  public.speed_events,
  public.night_rows,
  public.continuous_rows,
  public.driver_blocks,
  public.upload_batches,
  public.violation_records,
  public.violation_files,
  public.driver_roster_records,
  public.master_fleet_snapshots,
  public.master_fleet_status
  restart identity cascade;

-- driver_roster_meta is a single-row config table — reset its "who
-- uploaded / when" pointers instead of deleting the row so the boss's
-- upload UI has a sane default state.
update public.driver_roster_meta
set
  period = '',
  uploaded_at = null,
  uploader_id = null,
  file_name = null,
  file_type = null
where id = 'default';
