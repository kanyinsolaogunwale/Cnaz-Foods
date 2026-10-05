/**
 * Resolves the shared Supabase project (the website's own Supabase project)
 * at runtime and exposes a small catalogue/search cache so Home and Menu keep
 * working offline. Products and snack types are public data; the cache is
 * refreshed from the network on every successful fetch.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { endpoints, fallbackSupabase, isBackendConfigured, type BackendConfig } from "@/lib/env";
import type { Product } from "@/lib/types";

let client: SupabaseClient | null = null;
let resolvedConfig: BackendConfig | null = null;

/** In-memory + AsyncStorage cache of the public catalogue. */
type CacheShape = {
  products: Product[] | null;
  types: { value: string; count: number }[] | null;
  savedAt: number | null;
};

const CACHE_KEY = "cnaz-catalog-cache-v1";
const cache: CacheShape = { products: null, types: null, savedAt: null };

export async function loadCatalogCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as CacheShape;
    if (Array.isArray(parsed.products)) {
      cache.products = parsed.products;
      cache.types = Array.isArray(parsed.types) ? parsed.types : null;
      cache.savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : null;
    }
  } catch {
    // Corrupt cache — ignore, the network refresh will replace it.
  }
}

export function getCachedCatalog(): { products: Product[]; types: CacheShape["types"]; savedAt: number | null } {
  return { products: cache.products ?? [], types: cache.types, savedAt: cache.savedAt };
}

function persistCatalogCache(): void {
  void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch(() => undefined);
}

/**
 * Fetches the website's public Supabase connection details (URL + anon key +
 * whether Google OAuth is enabled) and creates the mobile's Supabase client.
 * Returns null when the website is unreachable or not yet configured.
 */
export async function resolveBackend(): Promise<BackendConfig | null> {
  // 1) Preferred: the website's runtime config endpoint.
  try {
    const response = await fetch(endpoints.mobileConfig, { headers: { Accept: "application/json" } });
    if (response.ok) {
      const body = (await response.json()) as Partial<BackendConfig> & {
        error?: string;
        supabaseKey?: string;
      };
      if (body.supabaseUrl && body.supabaseKey) {
        resolvedConfig = {
          supabaseUrl: body.supabaseUrl,
          supabaseAnonKey: body.supabaseKey,
          googleOAuthEnabled: Boolean(body.googleOAuthEnabled),
        };
      }
    }
  } catch {
    // Website unreachable — fall back to the bundled public values below.
  }

  // 2) Fallback: public values synced from the website's .env.local at
  //    bundle time (`npm run sync-env`).
  if (!resolvedConfig && fallbackSupabase.url && fallbackSupabase.anonKey) {
    resolvedConfig = {
      supabaseUrl: fallbackSupabase.url,
      supabaseAnonKey: fallbackSupabase.anonKey,
      googleOAuthEnabled: true,
    };
  }

  if (!isBackendConfigured(resolvedConfig)) return null;

  client = createClient(resolvedConfig.supabaseUrl, resolvedConfig.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // On web the OAuth redirect lands back on the page with the tokens in
      // the URL — supabase-js should pick them up. On native there is no
      // URL bar, so keep this off (the app parses deep links itself).
      detectSessionInUrl: Platform.OS === "web",
    },
  });
  return resolvedConfig;
}

export function getBackendConfig(): BackendConfig | null {
  return resolvedConfig;
}

/**
 * The shared Supabase client (same project, same anon key, same RLS as the
 * website). Throws only if called before resolveBackend() has succeeded —
 * callers gate on the config screen state first.
 */
export function getSupabase(): SupabaseClient {
  if (!client) throw new Error("Supabase client not ready, call resolveBackend() first.");
  return client;
}

export function isReady(): boolean {
  return isBackendConfigured(resolvedConfig);
}

/** Saves the catalogue + snack types to the cache. */
export function saveCatalogToCache(products: Product[], types: { value: string; count: number }[]): void {
  cache.products = products;
  cache.types = types;
  cache.savedAt = Date.now();
  persistCatalogCache();
}
