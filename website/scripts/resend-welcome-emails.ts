/**
 * Resend welcome emails to customers whose welcome never arrived
 * (profiles with welcome_email_status 'pending' or 'failed').
 *
 * Usage:
 *   npm run resend:welcomes
 *
 * Requires the Supabase service role key and at least one email provider in
 * .env.local. The same claim lock as the sign-in flow applies (pending/failed
 * → sending → sent/failed), so this is safe to run more than once.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * tsx does not load .env.local (that is a Next.js behaviour), so we parse it
 * ourselves BEFORE importing the mailer, which reads process.env at module
 * load time.
 */
function readEnv(key: string): string {
  const match = readFileSync(join(process.cwd(), ".env.local"), "utf8").match(
    new RegExp(`^${key}=(.*)$`, "m"),
  );
  return match ? match[1].trim() : "";
}

for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "GMAIL_FROM",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "MAILGUN_API_KEY",
  "MAILGUN_DOMAIN",
  "MAILGUN_FROM",
]) {
  if (!process.env[key]) {
    const value = readEnv(key);
    if (value) process.env[key] = value;
  }
}

let sendWelcomeEmail: (typeof import("../src/lib/mailgun"))["sendWelcomeEmail"];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || readEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  ({ sendWelcomeEmail } = await import("../src/lib/mailgun"));

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, full_name, welcome_email_status")
    .in("welcome_email_status", ["pending", "failed", "skipped"]);

  if (error) {
    console.error("Could not load profiles:", error.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log("No pending or failed welcome emails — everyone is up to date. ✅");
    return;
  }

  console.log(`Found ${profiles.length} welcome email(s) to (re)send.\n`);

  let sent = 0;
  let failed = 0;

  for (const profile of profiles) {
    if (!profile.email) {
      console.log(`- skip ${profile.id}: profile has no email address`);
      continue;
    }

    // Claim before sending so a concurrent sign-in cannot double-send.
    const { data: claimed, error: claimError } = await admin
      .from("profiles")
      .update({ welcome_email_status: "sending" })
      .eq("id", profile.id)
      .in("welcome_email_status", ["pending", "failed", "skipped"])
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) {
      console.log(`- skip ${profile.email}: could not claim (already being sent?)`);
      continue;
    }

    const status = await sendWelcomeEmail({
      name: profile.full_name,
      email: profile.email,
    });

    await admin
      .from("profiles")
      .update({ welcome_email_status: status })
      .eq("id", profile.id);

    if (status === "sent") {
      sent += 1;
      console.log(`✓ ${profile.email}: welcome sent`);
    } else {
      failed += 1;
      console.log(`✗ ${profile.email}: ${status} (will be retried next run / next sign-in)`);
    }
  }

  console.log(`\nDone — ${sent} sent, ${failed} not sent.`);
  if (failed > 0 && !process.env.GMAIL_USER) {
    console.log(
      "\nTip: without a verified sending domain, Resend only delivers to the inbox",
      "\nthat owns the Resend account. Add GMAIL_USER + GMAIL_APP_PASSWORD (free",
      "\nGmail app password) to .env.local to reach ANY customer inbox.",
    );
  }
}

main()
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
