import { NextResponse } from "next/server";
import type { EmailStatus } from "@/lib/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyDeleteToken } from "@/lib/delete-token.server";
import { sendAccountDeletedEmail } from "@/lib/mailgun";

export const runtime = "nodejs";

/**
 * POST /api/account/delete/confirm — step 2 of account deletion.
 *
 * Called by the `/delete-account` page's confirm button. Deliberately a POST:
 * email providers and security scanners follow links with GET, so a plain
 * link can never delete anything.
 *
 * Verifies the signed token, deletes the auth user with the service role
 * (the database FK detaches their orders as `user_id = null`, so the
 * business keeps its records), then emails a final receipt.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const verified = verifyDeleteToken(body?.token);
  if (!verified.valid) {
    const message =
      verified.reason === "expired"
        ? "This deletion link has expired. Sign in and request a new one from your account page."
        : "This deletion link is invalid or was already used.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "The shop database is not connected yet." }, { status: 503 });
  }

  const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(verified.uid);
  const user = userData?.user;
  if (getUserError || !user) {
    // The account is already gone (e.g. the link was confirmed twice).
    return NextResponse.json(
      { error: "This link is no longer valid. Your account may already be deleted." },
      { status: 410 },
    );
  }

  const email = user.email ?? "";
  const name =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

  const { error: deleteError } = await admin.auth.admin.deleteUser(verified.uid);
  if (deleteError) {
    console.error("[cnaz] Account deletion failed:", deleteError.message);
    return NextResponse.json(
      { error: "We couldn't delete your account right now. Please try again." },
      { status: 500 },
    );
  }

  let receipt: EmailStatus = "skipped";
  if (email) {
    receipt = await sendAccountDeletedEmail({ name, email });
    if (receipt !== "sent") {
      console.error(`[cnaz] Deletion receipt email ${receipt} for ${email}`);
    }
  }

  return NextResponse.json({ ok: true, email, receipt });
}
