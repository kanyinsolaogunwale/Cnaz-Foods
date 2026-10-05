"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/cart-context";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { addLine } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addLine(product, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="card group flex flex-col overflow-hidden">
      <Link
        href={`/products/${product.slug}`}
        className="stage relative block aspect-square"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={product.imageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          priority={priority}
          className="blend-lighten object-contain p-5 transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex-1">
          <h3 className="font-display text-[17px] font-semibold leading-snug text-ink-900">
            <Link href={`/products/${product.slug}`} className="hover:text-brand-700">
              {product.name}
            </Link>
          </h3>
          {product.taste ? (
            <p className="mt-1 text-sm text-ink-600">{product.taste}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-lg font-semibold text-ink-900">
            {formatNaira(product.priceNaira)}
          </p>
          <span className="chip border border-ink-200 bg-cream-50 text-ink-600">
            {product.weightLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="btn-secondary w-full"
          aria-live="polite"
        >
          {added ? "Added to cart ✓" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}
