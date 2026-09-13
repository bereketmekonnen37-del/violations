import { supabase } from '../../lib/supabaseClient';
import type { RecommendedAction } from './masterFleetStatusSlice';

export const fetchMasterFleetStatus = async (): Promise<
  Record<string, RecommendedAction>
> => {
  const { data, error } = await supabase.from('master_fleet_status').select('vid, action');
  if (error) throw new Error(error.message);
  const out: Record<string, RecommendedAction> = {};
  (data ?? []).forEach((row) => {
    out[row.vid as string] = row.action as RecommendedAction;
  });
  return out;
};

export const setMasterFleetStatusRemote = async (
  vid: string,
  action: RecommendedAction | null,
  updatedBy: string,
): Promise<void> => {
  if (action == null) {
    const { error } = await supabase.from('master_fleet_status').delete().eq('vid', vid);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('master_fleet_status').upsert({
    vid,
    action,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
};

/** One-time bulk push used to seed Supabase from a boss's pre-existing
 *  local-only statuses the first time this table is empty. */
export const bulkSeedMasterFleetStatus = async (
  entries: Record<string, RecommendedAction>,
  updatedBy: string,
): Promise<void> => {
  const rows = Object.entries(entries).map(([vid, action]) => ({
    vid,
    action,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('master_fleet_status').upsert(rows);
  if (error) throw new Error(error.message);
};
