/**
 * Environment for the Cnaz Foods mobile app.
 *
 * One variable, EXPO_PUBLIC_WEBSITE_URL, points the app at the existing
 * Cnaz Foods website. Everything else is derived from it:
 *
 * - catalogue:        <website>/api/products        (public, already existed)
 * - orders:           <website>/api/orders          (Bearer auth added)
 * - sign-out notice:  <website>/api/account/signout-notice (Bearer auth added)
 * - Supabase URL/key: served by <website>/api/mobile/config
 *                     (reads the website's own NEXT_PUBLIC_* env vars, so the
 *                     mobile app shares the exact same Supabase project)
 *
 * EXPO_PUBLIC_* variables are inlined at bundle time by Expo. They are public
 * by design (like NEXT_PUBLIC_*): no service-role key, no mail credentials,
 * no secrets ever reach the app.
 */
function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

const rawWebsiteUrl =
  process.env.EXPO_PUBLIC_WEBSITE_URL ?? "http://localhost:3000";

export const websiteUrl = normalize(rawWebsiteUrl);

/**
 * Fallback Supabase details baked in at bundle time by `npm run sync-env`
 * (copied from the website's .env.local). The app prefers the runtime
 * /api/mobile/config response; these are used only if that fetch fails.
 */
export const fallbackSupabase = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const endpoints = {
  products: `${websiteUrl}/api/products`,
  orders: `${websiteUrl}/api/orders`,
  signoutNotice: `${websiteUrl}/api/account/signout-notice`,
  accountDelete: `${websiteUrl}/api/account/delete`,
  mobileConfig: `${websiteUrl}/api/mobile/config`,
} as const;

/**
 * Resolved at runtime from the website's /api/mobile/config endpoint (see
 * src/lib/supabase.ts). The values are the website's public Supabase URL and
 * anon key — the same ones the website's browser already receives.
 */
export type BackendConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleOAuthEnabled: boolean;
};

/** True when the Supabase connection details have been resolved. */
export function isBackendConfigured(config: BackendConfig | null): config is BackendConfig {
  return Boolean(config && config.supabaseUrl && config.supabaseAnonKey);
}
