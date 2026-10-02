"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CartIcon, TrashIcon } from "@/components/icons";
import { QuantityStepper } from "@/components/quantity-stepper";
import { useCart } from "@/context/cart-context";
import { formatNaira } from "@/lib/format";
import type { CartLine } from "@/lib/types";

export function CartView() {
  const { lines, ready, count, subtotal, setQuantity, removeLine } = useCart();
  const [lineToRemove, setLineToRemove] = useState<CartLine | null>(null);

  if (!ready) {
    return (
      <div className="space-y-4" aria-hidden="true">
        {[0, 1].map((index) => (
          <div key={index} className="card flex items-center gap-4 p-4">
            <div className="h-20 w-20 animate-pulse rounded-xl bg-ink-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
              <div className="h-4 w-1/4 animate-pulse rounded bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
          <CartIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900">
          Your cart is empty
        </h2>
        <p className="mt-2 text-ink-600">
          Add some snacks and they&apos;ll show up here.
        </p>
        <Link href="/shop" className="btn-primary mt-6">
          Browse our snacks
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <ul className="card divide-y divide-ink-200/80 px-4 sm:px-6">
        {lines.map((line) => (
          <li key={line.productId} className="flex gap-4 py-5">
            <Link
              href={`/products/${line.slug}`}
              className="stage relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24"
              tabIndex={-1}
              aria-hidden="true"
            >
              <Image
                src={line.imageUrl}
                alt=""
                fill
                sizes="96px"
                className="blend-lighten object-contain p-2"
              />
            </Link>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-medium text-ink-900">
                  <Link href={`/products/${line.slug}`} className="hover:text-brand-700">
                    {line.name}
                  </Link>
                </h2>
                <p className="mt-0.5 text-sm text-ink-600">
                  {line.weightLabel} · {formatNaira(line.priceNaira)} each
                </p>
                <button
                  type="button"
                  onClick={() => setLineToRemove(line)}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 underline-offset-2 hover:text-accent hover:underline"
                  aria-label={`Remove ${line.name} from cart`}
                >
                  <TrashIcon />
                  Remove
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <QuantityStepper
                  value={line.quantity}
                  onChange={(next) => setQuantity(line.productId, next)}
                  label={line.name}
                />
                <p className="w-24 text-right font-semibold tabular-nums text-ink-900">
                  {formatNaira(line.priceNaira * line.quantity)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="card p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold text-ink-900">Order summary</h2>
        <dl className="mt-4 space-y-3 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-ink-600">
              Subtotal ({count} item{count === 1 ? "" : "s"})
            </dt>
            <dd className="font-medium tabular-nums">{formatNaira(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">Delivery</dt>
            <dd className="font-medium text-ink-600">To be confirmed</dd>
          </div>
          <div className="flex justify-between border-t border-ink-200 pt-3">
            <dt className="text-base font-semibold text-ink-900">Total</dt>
            <dd className="text-base font-semibold tabular-nums text-ink-900">
              {formatNaira(subtotal)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Delivery is arranged after checkout. We&apos;ll contact you to confirm the
          details and any delivery fee.
        </p>
        <Link href="/checkout" className="btn-primary mt-5 w-full">
          Proceed to checkout
        </Link>
        <Link href="/shop" className="btn-secondary mt-2.5 w-full">
          Continue shopping
        </Link>
      </aside>

      <ConfirmDialog
        open={lineToRemove !== null}
        title="Remove this item?"
        description={`${lineToRemove?.name ?? "This item"} (${lineToRemove?.weightLabel ?? ""}) will be removed from your cart.`}
        confirmLabel="Remove item"
        onConfirm={() => {
          if (lineToRemove) removeLine(lineToRemove.productId);
          setLineToRemove(null);
        }}
        onDismiss={() => setLineToRemove(null)}
      />
    </div>
  );
}
