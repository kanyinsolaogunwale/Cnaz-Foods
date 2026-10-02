"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types";

type Props = {
  orderId: string;
  paymentStatus: PaymentStatus;
  totalNaira: number;
  paymentEnabled: boolean;
};

/**
 * Pay-now panel on the order confirmation page. The customer pays the snack
 * total on Paystack's hosted page (cards, bank transfer, USSD); delivery is
 * still confirmed by phone. Hidden entirely when the order is paid.
 */
export function OrderPaymentPanel({ orderId, paymentStatus, totalNaira, paymentEnabled }: Props) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No Paystack keys configured — payment is arranged by phone, as before.
  if (!paymentEnabled || paymentStatus === "paid") return null;

  async function startPayment() {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        authorizationUrl?: string;
        error?: string;
      } | null;

      if (response.ok && data?.authorizationUrl) {
        // Leave the app for Paystack's hosted checkout; Paystack brings the
        // customer back to /api/payments/callback which returns here.
        window.location.href = data.authorizationUrl;
        return;
      }

      setError(
        data?.error ??
          "We couldn't start the payment. Place the order another way: call or WhatsApp us.",
      );
      setStarting(false);
    } catch {
      setError("We couldn't reach the payment provider. Please check your connection and try again.");
      setStarting(false);
    }
  }

  const pending = paymentStatus === "pending";

  return (
    <section className="card mt-6 p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink-900">Payment</h2>

      {error ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-medium text-accent-dark"
        >
          {error}
        </div>
      ) : null}

      {pending ? (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
          Your payment is still being confirmed by your bank or Paystack. This page updates
          once it goes through. If you already completed it, there&apos;s nothing more to do.
        </p>
      ) : paymentStatus === "failed" ? (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
          The last payment attempt didn&apos;t go through. You can safely try again, or we can
          arrange payment when we call you.
        </p>
      ) : (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
          Pay <strong className="font-semibold text-ink-900">{formatNaira(totalNaira)}</strong>{" "}
          securely with your card, bank transfer or USSD. Delivery is arranged with you
          separately, with no online charge for it.
        </p>
      )}

      <button
        type="button"
        onClick={startPayment}
        disabled={starting}
        aria-busy={starting}
        className="btn-primary mt-4"
      >
        {starting ? "Taking you to Paystack…" : paymentStatus === "failed" ? "Try payment again" : `Pay ${formatNaira(totalNaira)} online`}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-ink-500">
        Prefer to pay on delivery? No problem, we&apos;ll confirm everything when we call you.
      </p>
    </section>
  );
}
