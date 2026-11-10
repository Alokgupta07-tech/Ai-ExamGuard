import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseSecretKey) {
  // In production, ensure both keys are defined
  console.warn('Supabase URL or Secret Key is missing from environment variables.');
}

/**
 * Supabase Admin client with service_role permissions.
 * Never import or expose this client in client-side code!
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

