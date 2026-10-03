import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendDeleteConfirmationEmail } from "@/lib/mailgun";
import { createDeleteToken, DELETE_LINK_TTL_MINUTES } from "@/lib/delete-token.server";
import { site } from "@/lib/site";

export const runtime = "nodejs";

// Soft in-memory cooldown so a stuck button (or a script) cannot flood an
// inbox with deletion links. Serverless instances are short-lived, so this
// is a dampener, not a hard guarantee.
const COOLDOWN_MS = 60_000;
const lastRequestAt = new Map<string, number>();

/**
 * POST /api/account/delete — step 1 of account deletion.
 *
 * Does NOT delete anything. It emails the signed-in customer a secure link
 * (`/delete-account?token=…`, valid for 60 minutes). The account is deleted
 * only when that link is opened and confirmed, so a stray click in the app
 * can never remove an account on its own.
 */
export async function POST() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "The shop database is not connected yet." }, { status: 503 });
  }

  const { data, error: userError } = await supabase.auth.getUser();
  const user = data?.user;
  if (userError || !user) {
    return NextResponse.json({ error: "You need to be signed in to do that." }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "The shop database is not connected yet." }, { status: 503 });
  }

  const email = user.email ?? "";
  if (!email) {
    return NextResponse.json(
      { error: "Your account has no email address we can send the link to." },
      { status: 400 },
    );
  }

  const last = lastRequestAt.get(user.id);
  if (last && Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "A deletion link was just sent. Please check your inbox." },
      { status: 429 },
    );
  }

  const token = createDeleteToken(user.id);
  const confirmUrl = `${site.url}/delete-account?token=${token}`;
  const name =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

  const status = await sendDeleteConfirmationEmail({
    name,
    email,
    confirmUrl,
    expiresInMinutes: DELETE_LINK_TTL_MINUTES,
  });

  if (status !== "sent") {
    console.error(`[cnaz] Delete-confirmation email ${status} for ${email}`);
    return NextResponse.json(
      { error: "We couldn't send the confirmation email right now. Please try again in a moment." },
      { status: 502 },
    );
  }

  // Cooldown starts only after a successful send, so a failed send can be
  // retried straight away.
  lastRequestAt.set(user.id, Date.now());

  return NextResponse.json({ ok: true, email, expiresInMinutes: DELETE_LINK_TTL_MINUTES });
}
