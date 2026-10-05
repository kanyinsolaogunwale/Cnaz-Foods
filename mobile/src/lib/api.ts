/**
 * Products API client — calls the website's public GET /api/products endpoint,
 * which runs the SAME getCatalog() search/filter/sort logic as the website's
 * shop page. The website and mobile app therefore always show identical
 * catalogue results from the same Supabase `products` table.
 */
import { endpoints } from "@/lib/env";
import type { Product } from "@/lib/types";

export type CatalogQuery = {
  /** Free text; matched against name, description, taste and weight label. */
  q?: string;
  /** "featured" (default) | "price-asc" | "price-desc". */
  sort?: "featured" | "price-asc" | "price-desc";
  /** Snack type derived from real product names ("Chips", "Nuts", "Other"). */
  type?: string;
  /** Minimum price in naira. */
  min?: number;
  /** Maximum price in naira. */
  max?: number;
};

export type CatalogResponse = {
  products: Product[];
  count: number;
  /** Snack types that actually exist, with how many products each holds. */
  types: { value: string; count: number }[];
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requestJson(input: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(input, init);
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON response (e.g. a proxy error page).
  }
  if (!response.ok) {
    const message =
      (body as { error?: string } | null)?.error ??
      (response.status >= 500
        ? "We couldn't reach Cnaz Foods right now. Please try again."
        : "Something went wrong. Please try again.");
    throw new ApiError(message, response.status);
  }
  return body;
}

export async function fetchCatalog(query: CatalogQuery = {}): Promise<CatalogResponse> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.sort && query.sort !== "featured") params.set("sort", query.sort);
  if (query.type) params.set("type", query.type);
  if (typeof query.min === "number" && Number.isFinite(query.min)) {
    params.set("min", String(query.min));
  }
  if (typeof query.max === "number" && Number.isFinite(query.max)) {
    params.set("max", String(query.max));
  }
  const qs = params.toString();
  const data = (await requestJson(`${endpoints.products}${qs ? `?${qs}` : ""}`)) as CatalogResponse;
  if (!Array.isArray(data.products)) {
    throw new ApiError("The catalogue is not available right now.", 503);
  }
  return data;
}

/** Single product lookup via the catalogue API's `slug` parameter. */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const data = (await requestJson(`${endpoints.products}?slug=${encodeURIComponent(slug)}`)) as {
    product?: Product | null;
  };
  return data.product ?? null;
}
