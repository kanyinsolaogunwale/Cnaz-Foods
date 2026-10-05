import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyPayment, verifyWebhookSignature } from "@/lib/paystack";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";

type PaystackEvent = {
  event?: string;
  data?: { reference?: string };
};

/**
 * POST /api/payments/webhook — Paystack pushes charge events here. The
 * signature is validated against the raw body; then we still re-verify with
 * the API (defence in depth) before touching the order. Paystack retries
 * deliveries, so every step is idempotent.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PaystackEvent | null = null;
  try {
    event = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const reference = event?.data?.reference;
  if (!reference || (event?.event !== "charge.success" && event?.event !== "charge.failed")) {
    // Other events (transfer.*, refund.processed, …) are not handled yet.
    return NextResponse.json({ received: true });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  const { data } = await admin
    .from("orders")
    .select("*")
    .eq("payment_reference", reference)
    .maybeSingle();
  const order = data as OrderRow | null;
  if (!order) {
    // Unknown reference — acknowledge so Paystack stops retrying.
    return NextResponse.json({ received: true });
  }

  // Already settled? Keep the first decision (idempotent under retries).
  if (order.payment_status === "paid" || order.payment_status === "failed") {
    return NextResponse.json({ received: true });
  }

  const verification = await verifyPayment(reference);
  if (!verification.ok) {
    // Ask Paystack to retry later.
    return NextResponse.json({ error: "Verify unavailable." }, { status: 503 });
  }

  if (verification.outcome === "success" && verification.amountKobo === order.total_naira * 100) {
    await admin
      .from("orders")
      .update({ payment_status: "paid", paid_at: verification.paidAt ?? new Date().toISOString() })
      .eq("id", order.id);
  } else if (verification.outcome === "failed") {
    await admin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
  }

  return NextResponse.json({ received: true });
}
