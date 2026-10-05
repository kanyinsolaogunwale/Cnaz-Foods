import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Bearer-token authentication for the Cnaz Foods mobile app.
 *
 * The mobile app is a React Native client: it has no cookies, so it sends its
 * Supabase access token in the `Authorization: Bearer <token>` header. This
 * module builds a short-lived Supabase client from that header so API routes
 * can authenticate BOTH kinds of callers:
 *
 * - website: session cookies (unchanged — `getSupabaseServerClient()`)
 * - mobile:  `Authorization: Bearer …` (this module)
 *
 * The client uses the public anon key only — the same key the browser already
 * holds — so no secret is exposed. Row Level Security applies exactly as it
 * does on the website.
 */
export function createSupabaseClientFromAuthHeader(
  authHeader: string | null,
): ReturnType<typeof createClient> | null {
  if (!isSupabaseConfigured || !authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = match?.[1]?.trim();
  if (!token) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}
