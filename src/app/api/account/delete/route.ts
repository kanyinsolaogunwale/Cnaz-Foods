import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/account/delete — permanently deletes the signed-in customer's
 * account (auth user). The database foreign keys cascade the deletion to the
 * profile and saved cart; orders already placed are kept with the business
 * (their user_id is set to null) so order history survives the deletion.
 * Requires a valid session — you can only delete your own account.
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

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[cnaz] Account deletion failed:", error.message);
    return NextResponse.json(
      { error: "We couldn't delete your account right now. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
