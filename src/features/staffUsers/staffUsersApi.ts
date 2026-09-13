import { supabase } from '../../lib/supabaseClient';
import type { ManagedStaffUser } from '../../types';

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  assigned_transporters: string[];
  created_at: string;
}

const toManagedUser = (row: ProfileRow): ManagedStaffUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  assignedTransporters: row.assigned_transporters ?? [],
  createdAt: row.created_at,
});

export const fetchStaffUsers = async (): Promise<ManagedStaffUser[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, assigned_transporters, created_at')
    .eq('role', 'staff')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ProfileRow[]).map(toManagedUser);
};

interface FunctionResult {
  profile?: ProfileRow;
  success?: boolean;
  error?: string;
}

const invokeManageStaffUser = async (body: Record<string, unknown>): Promise<FunctionResult> => {
  const { data, error } = await supabase.functions.invoke<FunctionResult>('manage-staff-user', {
    body,
  });
  if (error) {
    // Edge Functions surface non-2xx responses as an error with no parsed
    // body by default — fall back to a generic message.
    throw new Error(error.message || 'The staff-management service is unavailable.');
  }
  if (data?.error) throw new Error(data.error);
  if (!data) throw new Error('No response from the staff-management service.');
  return data;
};

export interface CreateStaffUserInput {
  name: string;
  email: string;
  password: string;
  assignedTransporters: string[];
}

export const createStaffUserRemote = async (
  input: CreateStaffUserInput,
): Promise<ManagedStaffUser> => {
  const result = await invokeManageStaffUser({ action: 'create', ...input });
  if (!result.profile) throw new Error('Staff account created, but no profile was returned.');
  return toManagedUser(result.profile);
};

export interface UpdateStaffUserInput {
  userId: string;
  name?: string;
  email?: string;
  password?: string;
  assignedTransporters?: string[];
}

export const updateStaffUserRemote = async (
  input: UpdateStaffUserInput,
): Promise<ManagedStaffUser> => {
  const result = await invokeManageStaffUser({ action: 'update', ...input });
  if (!result.profile) throw new Error('Staff account updated, but no profile was returned.');
  return toManagedUser(result.profile);
};

export const deleteStaffUserRemote = async (userId: string): Promise<void> => {
  await invokeManageStaffUser({ action: 'delete', userId });
};
