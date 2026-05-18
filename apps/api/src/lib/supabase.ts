import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Supabase admin client for API server use.
 * Lazily initialized so dotenv has time to load env vars.
 * Uses the service role key for admin operations.
 * NEVER expose this client to the frontend.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

// Backward-compatible named export — lazy Proxy that delegates to the real client
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const real = getSupabaseAdmin();
    const value = Reflect.get(real, prop, real);
    if (typeof value === "function") {
      return value.bind(real);
    }
    return value;
  },
});
