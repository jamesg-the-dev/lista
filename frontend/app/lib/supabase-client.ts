import { createClient } from "@supabase/supabase-js";

// Single Supabase client for the whole app — Auth session storage/refresh
// and (per CLAUDE.md) Realtime subscriptions both go through this instance.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// Current session's access token, or null if signed out. api-client.ts calls
// this per-request rather than caching the token, since Supabase silently
// rotates it on refresh.
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
