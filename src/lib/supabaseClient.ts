import { createClient } from '@supabase/supabase-js';
import storage from './chromeStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Check .env.local.',
  );
}

// Reuse the chrome.storage/localStorage adapter already used by redux-persist
// so auth sessions survive the same way in a packaged extension build.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
