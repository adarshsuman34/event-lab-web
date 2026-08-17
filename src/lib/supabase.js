import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail loudly at startup rather than with a confusing 401 on the first query.
if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase config. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'to .env.local, then restart the dev server (Vite only reads env at boot).'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
