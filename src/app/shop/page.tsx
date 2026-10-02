import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { SetupNotice } from "@/components/setup-notice";
import { getProducts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Shop Cnaz Foods snacks — crunchy plantain chips, roasted peanuts and seasoned groundnut.",
};

export default async function ShopPage() {
  const { products, configured } = await getProducts();

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
        {configured && products.length > 0 ? (
          <p className="mt-4 text-sm font-medium text-ink-500">
            {products.length} product{products.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        {!configured ? (
          <SetupNotice />
        ) : products.length === 0 ? (
          <p className="text-ink-600">
            Our products are being added — please check back soon.
          </p>
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
