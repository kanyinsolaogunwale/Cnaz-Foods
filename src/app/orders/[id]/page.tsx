import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircleIcon, MapPinIcon } from "@/components/icons";
import { OrderPaymentPanel } from "@/components/order-payment-panel";
import { OrderStatusChip } from "@/components/order-status-chip";
import { SetupNotice } from "@/components/setup-notice";
import { formatDateTime, formatNaira } from "@/lib/format";
import { isOrderId } from "@/lib/orders";
import { isPaymentEnabled } from "@/lib/paystack";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { payment?: string };
}) {
  if (!isOrderId(params.id)) notFound();

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return (
      <div className="container-page py-14">
        <SetupNotice title="Connect Supabase to look up orders" />
      </div>
    );
  }

  const { data, error } = await admin
    .from("orders")
    .select("*, order_items (*)")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("[cnaz] Failed to load order:", error.message);
  }
  const order = data as OrderRow | null;
  if (!order) notFound();

  const items = order.order_items ?? [];

  const supabase = getSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const isSignedIn = Boolean(user);

  const paymentBanner = searchParams.payment
    ? ({
        success: null,
        pending: {
          tone: "info" as const,
          text: "Your payment is still being confirmed; this page shows the final status.",
        },
        failed: {
          tone: "warn" as const,
          text: "The payment didn't go through. Your order is saved and nothing was charged; you can try again below.",
        },
        unverified: {
          tone: "warn" as const,
          text: "We couldn't confirm your payment just now. If you were charged, don't worry: we'll verify with the payment provider and confirm by phone.",
        },
        "amount-mismatch": {
          tone: "warn" as const,
          text: "We received a payment that doesn't match this order's total. Our team will review it and contact you.",
        },
      }[searchParams.payment] ?? null)
    : null;

  const emailNote =
    order.email_status === "failed"
      ? {
          tone: "warn" as const,            text: `We couldn't send the confirmation email to ${order.customer_email}. Your order is still confirmed; please keep your order number safe.`,
        }
      : order.email_status === "skipped"
        ? {
            tone: "info" as const,
            text: "Email confirmations are not switched on yet. Your order is saved; please keep your order number safe.",
          }
        : null;

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
            <CheckCircleIcon className="h-9 w-9" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Thank you, {order.customer_name.split(" ")[0]}!
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-600">
            Your order has been received and we&apos;re getting your snacks ready.
          </p>

          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3">
            <span className="chip border border-ink-200 bg-white text-ink-700">
              Order number
              <strong className="font-semibold tracking-wide text-ink-900">
                {order.reference}
              </strong>
            </span>
            <OrderStatusChip status={order.status} />
          </div>
          <p className="mt-3 text-sm text-ink-500">
            Placed on {formatDateTime(order.created_at)}
          </p>
        </div>

        {emailNote ? (
          <div
            role="status"
            className={`mt-8 rounded-xl px-4 py-3 text-sm font-medium ${
              emailNote.tone === "warn"
                ? "border border-accent/30 bg-accent-soft text-accent-dark"
                : "border border-gold/40 bg-gold-soft text-ink-800"
            }`}
          >
            {emailNote.text}
          </div>
        ) : null}

        {paymentBanner ? (
          <div
            role="status"
            className={`mt-8 rounded-xl px-4 py-3 text-sm font-medium ${
              paymentBanner.tone === "warn"
                ? "border border-accent/30 bg-accent-soft text-accent-dark"
                : "border border-gold/40 bg-gold-soft text-ink-800"
            }`}
          >
            {paymentBanner.text}
          </div>
        ) : null}

        {order.payment_status === "paid" ? (
          <div
            role="status"
            className="mt-8 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
          >
            <CheckCircleIcon className="h-5 w-5 shrink-0" />
            Payment received. Thank you! You&apos;ll get a receipt from Paystack by email/SMS.
          </div>
        ) : null}

        <OrderPaymentPanel
          orderId={order.id}
          paymentStatus={order.payment_status}
          totalNaira={order.total_naira}
          paymentEnabled={isPaymentEnabled()}
        />

        <section className="card mt-8 overflow-hidden">
          <h2 className="border-b border-ink-200/80 px-5 py-4 font-display text-lg font-semibold text-ink-900 sm:px-6">
            Order summary
          </h2>
          <ul className="divide-y divide-ink-200/80 px-5 sm:px-6">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="font-medium text-ink-900">{item.product_name}</p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {item.product_weight ? `${item.product_weight} · ` : ""}
                    Qty {item.quantity} × {formatNaira(item.unit_price_naira)}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-ink-900">
                  {formatNaira(item.line_total_naira)}
                </p>
              </li>
            ))}
          </ul>
          <dl className="space-y-3 border-t border-ink-200/80 px-5 py-5 text-[15px] sm:px-6">
            <div className="flex justify-between">
              <dt className="text-ink-600">Subtotal</dt>
              <dd className="font-medium tabular-nums">{formatNaira(order.subtotal_naira)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">Delivery</dt>
              <dd className="font-medium text-ink-600">
                {order.delivery_fee_naira > 0
                  ? formatNaira(order.delivery_fee_naira)
                  : "To be confirmed"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-ink-200 pt-3">
              <dt className="text-base font-semibold text-ink-900">Total</dt>
              <dd className="text-base font-semibold tabular-nums text-ink-900">
                {formatNaira(order.total_naira)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card mt-6 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
            <MapPinIcon className="h-5 w-5 text-brand-700" />
            Delivery details
          </h2>
          <div className="mt-3 space-y-1 text-[15px] leading-relaxed text-ink-700">
            <p className="font-medium text-ink-900">{order.customer_name}</p>
            <p>{order.customer_phone}</p>
            <p>{order.delivery_address}</p>
            <p>{[order.city, order.state].filter(Boolean).join(", ")}</p>
            {order.note ? (
              <p className="text-sm italic text-ink-600">Note: {order.note}</p>
            ) : null}
          </div>
        </section>

        <section className="card mt-6 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            What happens next
          </h2>
          <ol className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-700">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                1
              </span>
              We review your order and prepare your snacks.
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                2
              </span>
              We contact you on {order.customer_phone} to arrange delivery.
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                3
              </span>
              Your snacks are packed and on their way.
            </li>
          </ol>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/shop" className="btn-primary">
            Continue shopping
          </Link>
          {isSignedIn ? (
            <Link href="/account/orders" className="btn-secondary">
              View all your orders
            </Link>
          ) : (
            <Link href="/login?next=/account/orders" className="btn-secondary">
              Sign in to track your orders
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
