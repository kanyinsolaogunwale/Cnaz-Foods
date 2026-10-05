import { corsJson, corsPreflight } from "@/lib/cors";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/mobile/config — public bootstrap endpoint for the Cnaz Foods
 * mobile app.
 *
 * Hands the mobile app the SAME public Supabase project details the website's
 * browser already receives (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY), so the app
 * shares the website's database, auth and carts without any secret leaving
 * the server. The anon key is a publishable client key: Row Level Security
 * remains the security boundary (exactly as on the website).
 *
 * No service-role key, Mailgun/Gmail credentials or Paystack secret are ever
 * exposed here — those stay server-side in the website.
 */
export async function GET() {
  if (!isSupabaseConfigured) {
    return corsJson({ error: "The shop backend is not configured yet." }, { status: 503 });
  }

  return corsJson({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    // Google OAuth is browser-based on the website; the mobile app mirrors
    // whatever the website has configured. The app shows the Google button
    // when this is true and its redirect URL is allow-listed in Supabase.
    googleOAuthEnabled: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED !== "false",
  });
}
