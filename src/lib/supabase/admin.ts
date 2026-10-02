import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";
import { isSupabaseAdminConfigured, supabaseServiceRoleKey } from "@/lib/env.server";

let adminClient: SupabaseClient | null = null;

/**
 * Service-role Supabase client. SERVER ONLY — it bypasses Row Level Security,
 * so it is used exclusively by trusted server code (creating orders, reading
 * an order for its confirmation page) and never sent to the browser.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured) return null;
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
