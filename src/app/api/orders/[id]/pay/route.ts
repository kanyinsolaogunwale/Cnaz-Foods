import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { site } from "@/lib/site";
import { isPaymentEnabled, initializePayment } from "@/lib/paystack";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/orders/[id]/pay — starts a Paystack charge for an order.
 * The order must exist and be unpaid; the amount charged is the order's
 * server-side total (never a client value). Returns the hosted payment URL.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isPaymentEnabled()) {
    return NextResponse.json(
      { error: "Online payment is not set up yet. We'll confirm payment by phone." },
      { status: 503 },
    );
  }
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "The shop database is not connected yet." }, { status: 503 });
  }

  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("[cnaz] Failed to load order for payment:", error.message);
    return NextResponse.json({ error: "We couldn't load your order." }, { status: 500 });
  }
  const order = data as OrderRow | null;
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.payment_status === "paid") {
    return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  }

  const result = await initializePayment({
    email: order.customer_email,
    amountNaira: order.total_naira,
    orderReference: order.reference,
    callbackUrl: `${site.url}/api/payments/callback`,
    metadata: {
      order_reference: order.reference,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Record the attempt so the callback/webhook can find the order even if
  // the customer closes the tab mid-payment.
  const { error: updateError } = await admin
    .from("orders")
    .update({ payment_status: "pending", payment_reference: result.reference })
    .eq("id", order.id);

  if (updateError) {
    console.error("[cnaz] Failed to record payment attempt:", updateError.message);
  }

  return NextResponse.json({ authorizationUrl: result.authorizationUrl }, { status: 201 });
}
