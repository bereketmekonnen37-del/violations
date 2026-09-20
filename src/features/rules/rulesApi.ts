import { supabase } from '../../lib/supabaseClient';
import type {
  AllowedLocationLists,
  AllowedVidLists,
  RuleThresholds,
  UnderestimatedRule,
} from './rulesSlice';

export interface AppRulesPayload {
  thresholds: RuleThresholds;
  allowedVidsByType: AllowedVidLists;
  allowedLocationsByType: AllowedLocationLists;
  maxDurationSeconds: number | null;
  underestimatedRule: UnderestimatedRule | null;
}

/** The under-estimated rule rides along inside the existing `thresholds`
 *  jsonb column (as `underestimated`), so no schema migration is needed. */
type StoredThresholds = RuleThresholds & {
  underestimated?: UnderestimatedRule | null;
};

interface AppRulesRow {
  id: string;
  thresholds: StoredThresholds;
  allowed_vids: AllowedVidLists;
  allowed_locations: AllowedLocationLists;
  max_duration_seconds: number | null;
}

const toPayload = (row: AppRulesRow): AppRulesPayload => {
  const { underestimated, ...thresholds } = row.thresholds;
  return {
    thresholds,
    allowedVidsByType: row.allowed_vids,
    allowedLocationsByType: row.allowed_locations,
    maxDurationSeconds: row.max_duration_seconds,
    // Rules saved before the logic flip used different field names; ignore them.
    underestimatedRule:
      underestimated &&
      underestimated.minDurationSeconds > 0 &&
      underestimated.maxKm > 0
        ? underestimated
        : null,
  };
};

/** Returns `null` when no shared rules row exists yet (fresh project). */
export const fetchAppRules = async (): Promise<AppRulesPayload | null> => {
  const { data, error } = await supabase
    .from('app_rules')
    .select('id, thresholds, allowed_vids, allowed_locations, max_duration_seconds')
    .eq('id', 'default')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return toPayload(data as AppRulesRow);
};

export const saveAppRules = async (
  payload: AppRulesPayload,
  updatedBy: string,
): Promise<void> => {
  const { error } = await supabase.from('app_rules').upsert({
    id: 'default',
    thresholds: {
      ...payload.thresholds,
      underestimated: payload.underestimatedRule,
    },
    allowed_vids: payload.allowedVidsByType,
    allowed_locations: payload.allowedLocationsByType,
    max_duration_seconds: payload.maxDurationSeconds,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
};
