import { NextResponse } from "next/server";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseClientFromAuthHeader } from "@/lib/supabase/bearer";
import { sendSignedOutEmail } from "@/lib/mailgun";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/account/signout-notice — emails the signed-in customer a short
 * "you signed out" notice. Called by the account page's sign-out dialog
 * while the session is still valid (the endpoint needs it to know who to
 * email) and before the local session is cleared. The Cnaz Foods mobile app
 * may also call it with an `Authorization: Bearer <token>` header. Email
 * trouble never blocks sign-out; the client ignores failures.
 */
export async function POST(request: Request) {
  const bearer = createSupabaseClientFromAuthHeader(request.headers.get("authorization"));
  const supabase = bearer ?? getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503, headers: CORS_HEADERS });
  }

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;
  if (error || !user) {
    return NextResponse.json({ ok: false }, { status: 401, headers: CORS_HEADERS });
  }

  const email = user.email ?? "";
  if (!email) {
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  const name =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

  const status = await sendSignedOutEmail({ name, email, signedOutAt: new Date() });
  if (status !== "sent") {
    console.error(`[cnaz] Sign-out notice email ${status} for ${email}`);
    return NextResponse.json({ ok: false, emailStatus: status }, { headers: CORS_HEADERS });
  }

  return NextResponse.json({ ok: true, emailStatus: status }, { headers: CORS_HEADERS });
}
