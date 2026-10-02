import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Only allow same-origin relative paths as the post-login destination. */
function safeNext(value: string | null): string {
  if (!value) return "/account";
  if (!value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

/**
 * Google sends the user back here (via Supabase) with an auth code.
 * We exchange it for a session cookie, then continue to the requested page.
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

  return NextResponse.redirect(`${origin}${next}`);
}
