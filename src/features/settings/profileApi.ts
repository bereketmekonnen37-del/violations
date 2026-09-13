import { supabase } from '../../lib/supabaseClient';

export interface ProfilePatch {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}

export const updateOwnProfile = async (userId: string, patch: ProfilePatch): Promise<void> => {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.email !== undefined) dbPatch.email = patch.email;
  if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;

  if (Object.keys(dbPatch).length > 0) {
    const { error } = await supabase.from('profiles').update(dbPatch).eq('id', userId);
    if (error) throw new Error(error.message);
  }

  if (patch.email !== undefined) {
    const { error } = await supabase.auth.updateUser({ email: patch.email });
    if (error) throw new Error(error.message);
  }
};

export const changeOwnPassword = async (
  email: string,
  currentPassword: string,
  nextPassword: string,
): Promise<void> => {
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verifyError) throw new Error('Current password is incorrect.');

  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) throw new Error(error.message);
};
