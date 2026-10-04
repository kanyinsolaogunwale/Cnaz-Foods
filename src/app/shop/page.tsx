import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SetupNotice } from "@/components/setup-notice";
import { ShopFilters, type ShopFilterValues } from "@/components/shop-filters";
import { catalogQueryFromParams, getCatalog, getSnackTypes } from "@/lib/data";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Shop Cnaz Foods snacks: crunchy plantain chips, roasted peanuts and seasoned groundnut.",
};

type ShopSearchParams = {
  q?: string;
  sort?: string;
  type?: string;
  min?: string;
  max?: string;
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: ShopSearchParams;
}) {
  // One catalogue engine for the website and GET /api/products: the URL
  // params are parsed and validated, then applied to real database data.
  const query = catalogQueryFromParams(searchParams);
  const [{ products, configured }, types] = await Promise.all([
    getCatalog(query),
    getSnackTypes(),
  ]);

  const values: ShopFilterValues = {
    q: query.q ?? "",
    sort: query.sort ?? "",
    type: query.type ?? "",
    min: typeof query.minPrice === "number" ? String(query.minPrice) : "",
    max: typeof query.maxPrice === "number" ? String(query.maxPrice) : "",
  };

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
          Shop our snacks
        </h1>
        <p className="mt-3 leading-relaxed text-ink-600">
          Crunchy plantain chips and freshly packed nuts from Cnaz Foods. Perfect for
          everyday snacking, sharing with friends, parties, or enjoying on the go.
        </p>
      </header>

      {configured ? (
        <ShopFilters
          // Remount on every navigation so controls always reflect the URL.
          key={`${values.q}|${values.sort}|${values.type}|${values.min}|${values.max}`}
          types={types}
          values={values}
          resultCount={products.length}
        />
      ) : null}

      <div className="mt-8">
        {!configured ? (
          <SetupNotice />
        ) : products.length === 0 ? (
          types.length === 0 ? (
            <p className="text-ink-600">
              Our products are being added. Please check back soon.
            </p>
          ) : (
            <div className="card mx-auto max-w-xl p-8 text-center" role="status">
              <h2 className="font-display text-lg font-semibold text-ink-900">
                No snacks match your search
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Try a different snack name, snack type or price range.
              </p>
              <Link href="/shop" className="btn-primary mt-5">
                Show all snacks
              </Link>
            </div>
          )
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
