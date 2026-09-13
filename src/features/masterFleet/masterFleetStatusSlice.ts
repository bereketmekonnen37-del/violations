import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { normalizeVid } from '../../lib/locationRules';

export type RecommendedAction = 'refresher' | 'engaged';

export const RECOMMENDED_ACTION_LABEL: Record<RecommendedAction, string> = {
  refresher: 'Needs refresher call',
  engaged: 'Shall be engaged',
};

export interface MasterFleetStatusState {
  /** VID (normalized) → selected recommended-action status. Missing key
   *  means no status has been selected — renders as an empty cell. */
  statusByVid: Record<string, RecommendedAction>;
  hydrated: boolean;
}

const initialState: MasterFleetStatusState = {
  statusByVid: {},
  hydrated: false,
};

interface SetActionPayload {
  vid: string;
  action: RecommendedAction | null;
}

const masterFleetStatusSlice = createSlice({
  name: 'masterFleetStatus',
  initialState,
  reducers: {
    hydrateMasterFleetStatus(
      state,
      action: PayloadAction<Record<string, RecommendedAction>>,
    ) {
      state.statusByVid = action.payload;
      state.hydrated = true;
    },
    setRecommendedAction(state, action: PayloadAction<SetActionPayload>) {
      const key = normalizeVid(action.payload.vid);
      if (!key) return;
      if (action.payload.action == null) {
        delete state.statusByVid[key];
        return;
      }
      state.statusByVid[key] = action.payload.action;
    },
  },
});

export const { hydrateMasterFleetStatus, setRecommendedAction } =
  masterFleetStatusSlice.actions;
export default masterFleetStatusSlice.reducer;
