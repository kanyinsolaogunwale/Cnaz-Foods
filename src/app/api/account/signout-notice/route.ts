import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendSignedOutEmail } from "@/lib/mailgun";

export const runtime = "nodejs";

/**
 * POST /api/account/signout-notice — emails the signed-in customer a short
 * "you signed out" notice. Called by the account page's sign-out dialog
 * while the session is still valid (the endpoint needs it to know who to
 * email) and before the local session is cleared. Email trouble never
 * blocks sign-out; the client ignores failures.
 */
export async function POST() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;
  if (error || !user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const email = user.email ?? "";
  if (!email) {
    return NextResponse.json({ ok: true });
  }

  const name =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

  const status = await sendSignedOutEmail({ name, email, signedOutAt: new Date() });
  if (status !== "sent") {
    console.error(`[cnaz] Sign-out notice email ${status} for ${email}`);
    return NextResponse.json({ ok: false, emailStatus: status });
  }

  return NextResponse.json({ ok: true, emailStatus: status });
}
