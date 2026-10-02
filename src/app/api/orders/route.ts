import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createOrder } from "@/lib/orders";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/orders — creates an order from the cart.
 * Prices are re-read from the database server-side; the Mailgun confirmation
 * email is sent after the order is saved.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    // Associate the order with the signed-in customer when there is one.
    const supabase = getSupabaseServerClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;

    const payload = (body ?? {}) as { items?: unknown; customer?: unknown };
    const result = await createOrder({
      items: payload.items,
      customer: payload.customer,
      userId: user?.id ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, fieldErrors: result.fieldErrors },
        { status: result.status },
      );
    }

    return NextResponse.json({ order: result.order }, { status: 201 });
  } catch (error) {
    console.error("[cnaz] Unexpected error while creating an order:", error);
    return NextResponse.json(
      { error: "Something went wrong while placing your order. Please try again." },
      { status: 500 },
    );
  }
}
