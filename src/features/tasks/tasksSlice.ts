import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Task, TasksState } from '../../types';

const initialState: TasksState = {
  tasks: [],
  status: 'idle',
  error: null,
  drawerOpen: false,
  lastLocalSeenAt: null,
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<TasksState['status']>) {
      state.status = action.payload;
      if (action.payload === 'ready') state.error = null;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      if (action.payload) state.status = 'error';
    },
    setTasks(state, action: PayloadAction<Task[]>) {
      state.tasks = action.payload;
      state.status = 'ready';
      state.error = null;
    },
    upsertTask(state, action: PayloadAction<Task>) {
      const task = action.payload;
      const idx = state.tasks.findIndex((t) => t.id === task.id);
      if (idx === -1) state.tasks.unshift(task);
      else state.tasks[idx] = task;
    },
    removeTask(state, action: PayloadAction<string>) {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
    },
    openDrawer(state) {
      state.drawerOpen = true;
      state.lastLocalSeenAt = new Date().toISOString();
    },
    closeDrawer(state) {
      state.drawerOpen = false;
    },
    clear(state) {
      state.tasks = [];
      state.status = 'idle';
      state.error = null;
      state.drawerOpen = false;
      state.lastLocalSeenAt = null;
    },
  },
});

export const {
  setStatus,
  setError,
  setTasks,
  upsertTask,
  removeTask,
  openDrawer,
  closeDrawer,
  clear,
} = tasksSlice.actions;
export default tasksSlice.reducer;
