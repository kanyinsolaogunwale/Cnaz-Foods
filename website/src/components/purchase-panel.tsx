"use client";

import { useState } from "react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { useCart } from "@/context/cart-context";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";

export function PurchasePanel({ product }: { product: Product }) {
  const { addLine } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "added">("idle");

  function handleAdd() {
    addLine(product, quantity);
    setStatus("added");
    window.setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <span id="quantity-label" className="label">
            Quantity
          </span>
          <QuantityStepper value={quantity} onChange={setQuantity} label={product.name} />
        </div>
        <div className="pt-6">
          <button type="button" onClick={handleAdd} className="btn-secondary min-w-52">
            Add to cart · {formatNaira(product.priceNaira * quantity)}
          </button>
        </div>
      </div>
      <p
        className="min-h-5 text-sm font-medium text-brand-700"
        role="status"
        aria-live="polite"
      >
        {status === "added" ? "Added to your cart." : ""}
      </p>
    </div>
  );
}
