import { NextResponse } from "next/server";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { catalogQueryFromParams, getCatalog, getSnackTypes } from "@/lib/data";

export async function OPTIONS() {
  return corsPreflight();
}

export const runtime = "nodejs";

/**
 * GET /api/products — the public catalogue as JSON.
 *
 * Written for the Cnaz Foods mobile app so it reuses the EXACT same
 * search/filter/sort logic as the website (src/lib/data.ts getCatalog) and
 * the same database. No authentication needed: products are publicly
 * readable (RLS). The Supabase URL + anon key are all a client needs for
 * carts, orders and auth (same tables, same RLS as the website).
 *
 * Query params (all optional):
 *   q     free text, matched against name, description, taste, weight
 *   sort  "featured" (default) | "price-asc" | "price-desc"
 *   type  snack type derived from real product names, e.g. "Chips", "Nuts"
 *         (options come from the `types` array in this response)
 *   min   minimum price in naira
 *   max   maximum price in naira
 *   slug  exact product slug — returns `{ product: Product | null }` instead
 *
 * Response: { products: Product[], count, types: { value, count }[] }
 *           (or `{ product: Product | null }` when `slug` is given)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  // Single-product lookup (mobile product details screen).
  const slug = url.searchParams.get("slug")?.trim();
  if (slug) {
    const { products, configured } = await getCatalog({});
    if (!configured) {
      return NextResponse.json({ error: "The shop database is not connected yet." }, { status: 503 });
    }
    return NextResponse.json(
      { product: products.find((p) => p.slug === slug) ?? null },
      { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
    );
  }

  const query = catalogQueryFromParams({
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    min: url.searchParams.get("min") ?? undefined,
    max: url.searchParams.get("max") ?? undefined,
  });

  const [{ products, configured }, types] = await Promise.all([
    getCatalog(query),
    getSnackTypes(),
  ]);

  if (!configured) {
    return NextResponse.json({ error: "The shop database is not connected yet." }, { status: 503 });
  }

  return NextResponse.json(
    { products, count: products.length, types },
    { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
  );
}
