// Boss-only staff account management. Runs with the service-role key
// (injected automatically as SUPABASE_SERVICE_ROLE_KEY by the Supabase
// platform) so it can create/update/delete real `auth.users` accounts —
// something the browser's publishable key can never be trusted to do.
//
// The caller's own access token (forwarded by supabase-js `functions.invoke`)
// is used to look up their profile and confirm they are a 'boss' before any
// admin action runs.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

interface CreatePayload {
  action: 'create';
  name: string;
  email: string;
  password: string;
  assignedTransporters: string[];
}
interface UpdatePayload {
  action: 'update';
  userId: string;
  name?: string;
  email?: string;
  password?: string;
  assignedTransporters?: string[];
}
interface DeletePayload {
  action: 'delete';
  userId: string;
}
type Payload = CreatePayload | UpdatePayload | DeletePayload;

const normalizeTransporters = (list: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  (list ?? []).forEach((raw) => {
    const t = String(raw ?? '').trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  });
  return out;
};

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: 'boss' | 'staff';
  assigned_transporters: string[];
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return json({ error: 'Invalid or expired session' }, 401);

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();
  if (callerProfileError || callerProfile?.role !== 'boss') {
    return json({ error: 'Only a boss account can manage staff users' }, 403);
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    if (payload.action === 'create') {
      const name = payload.name?.trim();
      const email = payload.email?.trim();
      const password = payload.password ?? '';
      if (!name || !email || password.length < 6) {
        return json(
          { error: 'Name, email and a password of at least 6 characters are required.' },
          400,
        );
      }
      const assignedTransporters = normalizeTransporters(payload.assignedTransporters ?? []);

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'staff' },
      });
      if (createError || !created.user) {
        return json({ error: createError?.message ?? 'Could not create the staff account.' }, 400);
      }

      const { data: profile, error: updateError } = await admin
        .from('profiles')
        .update({ name, assigned_transporters: assignedTransporters })
        .eq('id', created.user.id)
        .select('id, email, name, role, assigned_transporters, created_at')
        .single();
      if (updateError || !profile) {
        // The auth user exists but the profile patch failed — surface it
        // rather than leaving a half-configured account silently.
        return json(
          { error: updateError?.message ?? 'Account created, but saving details failed.' },
          500,
        );
      }

      return json({ profile: profile as ProfileRow });
    }

    if (payload.action === 'update') {
      const userId = payload.userId;
      if (!userId) return json({ error: 'Missing userId.' }, 400);

      const { data: target } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (!target || target.role !== 'staff') {
        return json({ error: 'Staff user not found.' }, 404);
      }

      if (payload.email || payload.password) {
        const attrs: { email?: string; password?: string } = {};
        if (payload.email) attrs.email = payload.email.trim();
        if (payload.password) {
          if (payload.password.length < 6) {
            return json({ error: 'Password must be at least 6 characters.' }, 400);
          }
          attrs.password = payload.password;
        }
        const { error: authError } = await admin.auth.admin.updateUserById(userId, attrs);
        if (authError) return json({ error: authError.message }, 400);
      }

      const patch: Record<string, unknown> = {};
      if (payload.name !== undefined) patch.name = payload.name.trim();
      if (payload.assignedTransporters !== undefined) {
        patch.assigned_transporters = normalizeTransporters(payload.assignedTransporters);
      }
      if (payload.email !== undefined) patch.email = payload.email.trim();

      const { data: profile, error: updateError } =
        Object.keys(patch).length > 0
          ? await admin
              .from('profiles')
              .update(patch)
              .eq('id', userId)
              .select('id, email, name, role, assigned_transporters, created_at')
              .single()
          : await admin
              .from('profiles')
              .select('id, email, name, role, assigned_transporters, created_at')
              .eq('id', userId)
              .single();
      if (updateError || !profile) {
        return json({ error: updateError?.message ?? 'Could not update the staff account.' }, 500);
      }

      return json({ profile: profile as ProfileRow });
    }

    if (payload.action === 'delete') {
      const userId = payload.userId;
      if (!userId) return json({ error: 'Missing userId.' }, 400);

      const { data: target } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (!target || target.role !== 'staff') {
        return json({ error: 'Staff user not found.' }, 404);
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) return json({ error: deleteError.message }, 400);

      return json({ success: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected server error.' }, 500);
  }
});
