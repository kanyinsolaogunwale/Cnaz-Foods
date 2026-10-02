import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Enter your delivery details and place your Cnaz Foods order.",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
          Checkout
        </h1>
        <p className="mt-3 max-w-2xl text-ink-600">
          Tell us where to deliver your snacks. You&apos;ll be able to pay securely online
          after placing the order — or pay when we call to confirm delivery.
        </p>
      </header>
      <CheckoutForm />
    </div>
  );
}
