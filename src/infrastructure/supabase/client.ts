import { createClient } from '@supabase/supabase-js';

function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}

export type SupabaseClient = ReturnType<typeof createBrowserClient>;

let client: SupabaseClient | null = null;

/**
 * Browser client with a persisted session, created on first use so that builds
 * and tests can load modules without Supabase credentials. Only infrastructure
 * and repository adapters call it.
 */
export function getSupabaseClient(): SupabaseClient {
  client ??= createBrowserClient();
  return client;
}
