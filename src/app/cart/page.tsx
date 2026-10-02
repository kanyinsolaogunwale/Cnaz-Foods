import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the Cnaz Foods snacks in your cart before checking out.",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
          Your cart
        </h1>
        <p className="mt-3 text-ink-600">Review your snacks before checking out.</p>
      </header>
      <CartView />
    </div>
  );
}
