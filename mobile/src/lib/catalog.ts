/**
 * Catalog loading for the mobile app — always through the website's
 * GET /api/products (identical search/filter/sort logic as the shop page).
 * Unfiltered results are cached to AsyncStorage so Home and Menu render
 * instantly on the next launch and still work briefly offline.
 */
import { fetchCatalog, type CatalogQuery, type CatalogResponse } from "@/lib/api";
import { getCachedCatalog, saveCatalogToCache } from "@/lib/supabase";
import type { Product } from "@/lib/types";

export type { CatalogQuery, CatalogResponse };

export type LoadResult = {
  products: Product[];
  types: { value: string; count: number }[];
  fromCache: boolean;
};

/** Loads the catalogue for a query. Empty query refreshes the offline cache. */
export async function loadCatalog(query: CatalogQuery = {}): Promise<LoadResult> {
  const data = await fetchCatalog(query);
  const types = data.types ?? [];
  const isUnfiltered = !query.q && !query.type && query.min == null && query.max == null && !query.sort;
  if (isUnfiltered) saveCatalogToCache(data.products, types);
  return { products: data.products, types, fromCache: false };
}

/** Synchronous, cache-first read for instant first render. */
export function cachedCatalog(): LoadResult {
  const { products, types } = getCachedCatalog();
  return { products, types: types ?? [], fromCache: products.length > 0 };
}
