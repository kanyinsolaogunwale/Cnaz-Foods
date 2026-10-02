import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EmailStatus } from "@/lib/types";
import { sendWelcomeEmail } from "@/lib/mailgun";

/** Only allow same-origin relative paths as the post-login destination. */
function safeNext(value: string | null): string {
  if (!value) return "/account";
  if (!value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

/**
 * Sends the one-time welcome email for a freshly created profile.
 *
 * The profile's `welcome_email_status` acts as a lock: only rows in
 * 'pending' (first sign-in) or 'failed' (previous attempt failed) are
 * claimed, so a returning customer never receives a second welcome and two
 * concurrent sign-ins cannot double-send. Returns the final status so the
 * caller can log it.
 */
async function deliverWelcomeEmail(user: {
  id: string;
  email: string;
  name: string | null;
}): Promise<EmailStatus | "not-claimed"> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    console.warn("[cnaz] Cannot send welcome email — service role client is not configured.");
    return "not-claimed";
  }

  const { data: claimed, error: claimError } = await admin
    .from("profiles")
    .update({ welcome_email_status: "sending" })
    .eq("id", user.id)
    .in("welcome_email_status", ["pending", "failed"])
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error("[cnaz] Welcome email claim failed:", claimError.message);
    return "not-claimed";
  }
  if (!claimed) {
    // Already welcomed on an earlier sign-in (or no profile row) — nothing to do.
    return "not-claimed";
  }

  const status = await sendWelcomeEmail({ name: user.name, email: user.email });

  const { error: updateError } = await admin
    .from("profiles")
    .update({ welcome_email_status: status })
    .eq("id", user.id);

  if (updateError) {
    console.error("[cnaz] Could not record welcome email status:", updateError.message);
  }
  return status;
}

/**
 * Google sends the user back here (via Supabase) with an auth code.
 * We exchange it for a session cookie, send the one-time welcome email for
 * brand-new customers, then continue to the requested page. The welcome
 * step never fails the sign-in — sendWelcomeEmail catches provider errors
 * and records the outcome on the profile.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const next = safeNext(searchParams.get("next"));

  // User cancelled the Google consent screen (or Google refused the request).
  if (error) {
    const reason = error === "access_denied" ? "cancelled" : "auth";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=setup`);
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[cnaz] Google auth code exchange failed:", exchangeError.message);
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // One-time welcome email (new customers only — see deliverWelcomeEmail).
  // Awaited so serverless platforms don't kill it after the redirect; it is
  // failure-tolerant by design and adds well under a second for returning
  // customers (a single claim query).
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (user?.email) {
    const name =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null;
    const status = await deliverWelcomeEmail({ id: user.id, email: user.email, name });
    if (status === "failed") {
      console.warn("[cnaz] Welcome email failed — it will retry on the next sign-in.");
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
