import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Product } from "@/lib/types";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  taste: string | null;
  ingredients: string[] | null;
  weight_label: string;
  price_naira: number;
  image_url: string;
  is_featured: boolean;
  sort_order: number;
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    taste: row.taste,
    ingredients: row.ingredients,
    weightLabel: row.weight_label,
    priceNaira: row.price_naira,
    imageUrl: row.image_url,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
  };
}

/** Anonymous client used only for public product reads on the server. */
function publicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Always read fresh product data — the catalogue changes in Supabase.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export type ProductsResult = { products: Product[]; configured: boolean };

/** All active products, in display order. */
export async function getProducts(): Promise<ProductsResult> {
  const supabase = publicClient();
  if (!supabase) return { products: [], configured: false };

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[cnaz] Failed to load products:", error.message);
    return { products: [], configured: true };
  }
  return { products: (data ?? []).map(mapProduct), configured: true };
}

/** Products marked as featured (homepage). */
export async function getFeaturedProducts(limit = 3): Promise<ProductsResult> {
  const supabase = publicClient();
  if (!supabase) return { products: [], configured: false };

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[cnaz] Failed to load featured products:", error.message);
    return { products: [], configured: true };
  }
  return { products: (data ?? []).map(mapProduct), configured: true };
}

/** A single active product by slug. */
export async function getProductBySlug(
  slug: string,
): Promise<{ product: Product | null; configured: boolean }> {
  const supabase = publicClient();
  if (!supabase) return { product: null, configured: false };

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[cnaz] Failed to load product:", error.message);
    return { product: null, configured: true };
  }
  return { product: data ? mapProduct(data) : null, configured: true };
}

// ---------------------------------------------------------------------------
//  Catalogue search, filters and sorting.
//
//  The products table has no category column, so a product's SNACK TYPE is
//  derived from its real name (the business categorises itself as
//  "Chips and Nuts"): names containing "chip" are Chips, names containing a
//  nut word (nut/peanut/groundnut/cashew) are Nuts, anything else is "Other".
//  The filter options offered by the UI are generated from the types that
//  actually exist in the database, so no fake categories ever appear. When
//  the business later wants explicit categories, add a `category` column and
//  replace snackTypeOf() with a read of that column.
// ---------------------------------------------------------------------------

/** Derives a product's snack type from its real name. */
export function snackTypeOf(name: string): string {
  const value = name.toLowerCase();
  if (value.includes("chip")) return "Chips";
  if (/\b(nut|nuts|peanut|groundnut|cashew|almond)/.test(value)) return "Nuts";
  return "Other";
}

export type ProductSort = "featured" | "price-asc" | "price-desc";

export type CatalogQuery = {
  /** Free text; matched against name, description, taste and weight label. */
  q?: string;
  sort?: ProductSort;
  /** Snack type derived from product names ("Chips", "Nuts", ...). */
  type?: string;
  minPrice?: number;
  maxPrice?: number;
};

function textMatches(product: Product, term: string): boolean {
  const haystack = [
    product.name,
    product.description,
    product.taste ?? "",
    product.weightLabel,
    snackTypeOf(product.name),
  ]
    .join(" \n ")
    .toLowerCase();
  return haystack.includes(term);
}

/**
 * Active products from the database with search, snack-type and price
 * filters applied, in the requested order. This is the single source of
 * truth for the shop page, the homepage search and GET /api/products, so
 * the mobile app gets identical behaviour from the same function.
 */
export async function getCatalog(query: CatalogQuery = {}): Promise<ProductsResult> {
  const { products, configured } = await getProducts();
  if (!configured || products.length === 0) return { products, configured };

  let result = products;

  const terms = (query.q ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length > 0) {
    result = result.filter((product) => terms.every((term) => textMatches(product, term)));
  }

  if (query.type) {
    result = result.filter((product) => snackTypeOf(product.name) === query.type);
  }

  if (typeof query.minPrice === "number" && Number.isFinite(query.minPrice)) {
    result = result.filter((product) => product.priceNaira >= (query.minPrice as number));
  }
  if (typeof query.maxPrice === "number" && Number.isFinite(query.maxPrice) && (query.maxPrice as number) > 0) {
    result = result.filter((product) => product.priceNaira <= (query.maxPrice as number));
  }

  if (query.sort === "price-asc") {
    result = [...result].sort((a, b) => a.priceNaira - b.priceNaira);
  } else if (query.sort === "price-desc") {
    result = [...result].sort((a, b) => b.priceNaira - a.priceNaira);
  }

  return { products: result, configured };
}

export type SnackTypeOption = { value: string; count: number };

/**
 * The snack types that actually exist among active products, with how many
 * products each holds. Drives the category filter UI (nothing is invented).
 */
export async function getSnackTypes(): Promise<SnackTypeOption[]> {
  const { products, configured } = await getProducts();
  if (!configured) return [];

  const counts = new Map<string, number>();
  for (const product of products) {
    const type = snackTypeOf(product.name);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

/** Parses and validates the catalogue query from URL search params. */
export function catalogQueryFromParams(params: {
  q?: string | string[];
  sort?: string | string[];
  type?: string | string[];
  min?: string | string[];
  max?: string | string[];
}): CatalogQuery {
  const first = (value?: string | string[]): string | undefined =>
    (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

  const sort = first(params.sort);
  const min = Number.parseInt(first(params.min) ?? "", 10);
  const max = Number.parseInt(first(params.max) ?? "", 10);

  return {
    q: first(params.q),
    sort: sort === "price-asc" || sort === "price-desc" ? sort : undefined,
    type: first(params.type),
    minPrice: Number.isFinite(min) && min >= 0 ? min : undefined,
    maxPrice: Number.isFinite(max) && max >= 0 ? max : undefined,
  };
}
