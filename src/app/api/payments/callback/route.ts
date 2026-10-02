import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyPayment } from "@/lib/paystack";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderRow } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/payments/callback — Paystack redirects the customer here after the
 * hosted payment page. The browser is never trusted: we ask Paystack's verify
 * API for the charge state using the stored payment reference and only then
 * mark the order paid. The customer is sent to their confirmation page either
 * way (the page shows the true payment state).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const trxref = searchParams.get("trxref") ?? searchParams.get("reference");

  if (!trxref) {
    return NextResponse.redirect(`${origin}/cart?payment=missing-reference`);
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.redirect(`${origin}/cart?payment=unavailable`);
  }

  const { data } = await admin
    .from("orders")
    .select("*")
    .eq("payment_reference", trxref)
    .maybeSingle();
  const order = data as OrderRow | null;

  if (!order) {
    return NextResponse.redirect(`${origin}/cart?payment=unknown-order`);
  }

  const verification = await verifyPayment(trxref);

  if (!verification.ok) {
    console.error("[cnaz] Payment callback verify failed:", verification.error);
    return NextResponse.redirect(`${origin}/orders/${order.id}?payment=unverified`);
  }

  if (verification.outcome === "success") {
    // Guard against paying a different amount than the order total.
    if (verification.amountKobo !== order.total_naira * 100) {
      console.error(
        `[cnaz] Payment amount mismatch for ${order.reference}: expected ${order.total_naira * 100} kobo, got ${verification.amountKobo}`,
      );
      await admin
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", order.id);
      return NextResponse.redirect(`${origin}/orders/${order.id}?payment=amount-mismatch`);
    }

    await admin
      .from("orders")
      .update({ payment_status: "paid", paid_at: verification.paidAt ?? new Date().toISOString() })
      .eq("id", order.id);

    return NextResponse.redirect(`${origin}/orders/${order.id}?payment=success`);
  }

  if (verification.outcome === "failed") {
    await admin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
    return NextResponse.redirect(`${origin}/orders/${order.id}?payment=failed`);
  }

  // Charge still pending (e.g. bank transfer not yet confirmed) — the order
  // stays 'pending' and the page explains it.
  return NextResponse.redirect(`${origin}/orders/${order.id}?payment=pending`);
}
