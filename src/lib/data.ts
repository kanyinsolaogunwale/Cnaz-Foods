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
