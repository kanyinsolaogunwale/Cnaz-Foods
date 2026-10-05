import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createOrder } from "@/lib/orders";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseClientFromAuthHeader } from "@/lib/supabase/bearer";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Resolve the caller's identity. The website authenticates with its session
 * cookies; the Cnaz Foods mobile app (same Supabase project, same accounts)
 * sends its own `Authorization: Bearer <access token>` header instead.
 */
async function resolveUser(request: NextRequest) {
  const bearer = createSupabaseClientFromAuthHeader(request.headers.get("authorization"));
  if (bearer) {
    const { data } = await bearer.auth.getUser();
    if (data.user) return data.user;
    return null;
  }
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  return (await supabase.auth.getUser()).data.user;
}

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
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    // Associate the order with the signed-in customer when there is one
    // (cookie session on the website, Bearer token from the mobile app).
    const user = await resolveUser(request);

    const payload = (body ?? {}) as { items?: unknown; customer?: unknown };
    const result = await createOrder({
      items: payload.items,
      customer: payload.customer,
      userId: user?.id ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, fieldErrors: result.fieldErrors },
        { status: result.status, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ order: result.order }, { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[cnaz] Unexpected error while creating an order:", error);
    return NextResponse.json(
      { error: "Something went wrong while placing your order. Please try again." },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
