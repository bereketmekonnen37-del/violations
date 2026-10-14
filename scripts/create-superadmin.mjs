#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// create-superadmin.mjs
// Creates a superadmin account in Supabase Auth + profiles table.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/create-superadmin.mjs
//
// Or set it inline:
//   node scripts/create-superadmin.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

// ── Config — edit these values ────────────────────────────────────────────────
const SUPABASE_URL = 'https://tajjwneteglckgydyuuh.supabase.co';

// Paste your Supabase SERVICE ROLE key here (from Supabase Dashboard →
// Project Settings → API → service_role key). This is server-only and must
// never be committed or exposed to the browser.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'PASTE_SERVICE_ROLE_KEY_HERE';

const SUPERADMIN_EMAIL    = 'superadmin@kalviolations.com';
const SUPERADMIN_PASSWORD = 'SuperAdmin@2026!';
const SUPERADMIN_NAME     = 'Superadmin';
// ─────────────────────────────────────────────────────────────────────────────

if (SERVICE_ROLE_KEY === 'PASTE_SERVICE_ROLE_KEY_HERE') {
  console.error('\n❌  Please set SUPABASE_SERVICE_ROLE_KEY or paste it into the script.\n');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log(`\n🔐  Creating superadmin: ${SUPERADMIN_EMAIL} …`);

  // 1 ── Create auth user
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: SUPERADMIN_EMAIL,
    password: SUPERADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { name: SUPERADMIN_NAME, role: 'superadmin' },
  });

  if (createError) {
    // Already exists? Try fetching instead.
    if (createError.message?.toLowerCase().includes('already')) {
      console.warn('⚠️   Auth user already exists — skipping creation, will update profile.');
    } else {
      console.error('❌  Failed to create auth user:', createError.message);
      process.exit(1);
    }
  }

  const userId = created?.user?.id;

  if (!userId) {
    // Try to find by email
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === SUPERADMIN_EMAIL);
    if (!existing) {
      console.error('❌  Could not find or create the auth user.');
      process.exit(1);
    }
    console.log('ℹ️   Found existing auth user:', existing.id);
    await upsertProfile(existing.id);
  } else {
    console.log('✅  Auth user created:', userId);
    await upsertProfile(userId);
  }
}

async function upsertProfile(userId) {
  console.log('📝  Upserting profiles row …');

  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      email: SUPERADMIN_EMAIL,
      name: SUPERADMIN_NAME,
      role: 'superadmin',
      assigned_transporters: [],
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('❌  Failed to upsert profile:', error.message);
    process.exit(1);
  }

  console.log('\n🎉  Superadmin account ready!\n');
  console.log('   Email   :', SUPERADMIN_EMAIL);
  console.log('   Password:', SUPERADMIN_PASSWORD);
  console.log('   Role    : superadmin');
  console.log('\n   ⚠️  Change the password after first login!\n');
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
