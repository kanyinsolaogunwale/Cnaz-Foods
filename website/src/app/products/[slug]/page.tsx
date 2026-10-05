import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { PurchasePanel } from "@/components/purchase-panel";
import { SetupNotice } from "@/components/setup-notice";
import { getProductBySlug, getProducts } from "@/lib/data";
import { formatNaira } from "@/lib/format";

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { product } = await getProductBySlug(params.slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 155),
    openGraph: {
      title: product.name,
      description: product.taste ?? product.description.slice(0, 155),
      images: [{ url: product.imageUrl, alt: product.name }],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { product, configured } = await getProductBySlug(params.slug);

  if (!configured) {
    return (
      <div className="container-page py-14">
        <SetupNotice />
      </div>
    );
  }
  if (!product) notFound();

  const { products } = await getProducts();
  const related = products.filter((item) => item.id !== product.id).slice(0, 3);

  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/shop" className="hover:text-brand-700">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-ink-900">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="stage relative aspect-square overflow-hidden rounded-3xl border border-ink-200/60">
          <Image
            src={product.imageUrl}
            alt={`${product.name} · ${product.weightLabel} pack`}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="blend-lighten object-contain p-6 sm:p-10"
          />
          <span className="chip absolute left-4 top-4 bg-white/95 text-ink-800 shadow-soft">
            {product.weightLabel}
          </span>
        </div>

        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-2xl font-semibold text-brand-700">
              {formatNaira(product.priceNaira)}
            </span>
            <span className="text-sm text-ink-600">· {product.weightLabel} pack</span>
          </div>

          {product.taste ? (
            <p className="mt-3 text-[15px] text-ink-700">
              <span className="font-semibold text-ink-900">Taste:</span> {product.taste}
            </p>
          ) : null}

          <p className="mt-5 leading-relaxed text-ink-700">{product.description}</p>

          {product.ingredients && product.ingredients.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-800">
                Ingredients
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {product.ingredients.map((ingredient) => (
                  <li
                    key={ingredient}
                    className="chip border border-ink-200 bg-cream-50 text-ink-700"
                  >
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 border-t border-ink-200 pt-6">
            <PurchasePanel product={product} />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Delivery is arranged after checkout. We&apos;ll contact you to confirm the
            details and any delivery fee.
          </p>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-16 border-t border-ink-200 pt-10">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
            More from Cnaz Foods
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
