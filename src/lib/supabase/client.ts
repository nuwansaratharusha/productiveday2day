// =============================================================
// ProductiveDay — Supabase Browser Client
// =============================================================
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (client) return client;
  const url  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
  const key  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    // Missing env vars — return a dummy client that surfaces a clear error
    // instead of crashing silently with a blank screen.
    throw new Error(
      "Supabase environment variables are not configured.\n\n" +
      "Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel " +
      "project settings (Settings → Environment Variables)."
    );
  }
  client = createSupabaseClient(url, key);
  return client;
}
