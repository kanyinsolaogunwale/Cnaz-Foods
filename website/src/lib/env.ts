/**
 * Public environment values (safe for the browser — NEXT_PUBLIC_* only).
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the public Supabase connection details are present. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
