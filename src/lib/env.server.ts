/**
 * Server-only environment values. NEVER import this module from a client
 * component — the service role key and email provider keys must stay on the
 * server.
 */
import { supabaseUrl } from "@/lib/env";

export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** True when the server can safely write to Supabase (orders, carts). */
export const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

// --- Mailgun (primary provider — satisfies the HNG requirement) --------------
export const mailgunApiKey = process.env.MAILGUN_API_KEY ?? "";
export const mailgunDomain = process.env.MAILGUN_DOMAIN ?? "";
export const mailgunFrom =
  process.env.MAILGUN_FROM ||
  (mailgunDomain ? `Cnaz Foods <postmaster@${mailgunDomain}>` : "");

export const isMailgunConfigured = Boolean(mailgunApiKey && mailgunDomain && mailgunFrom);

// --- Resend (fallback provider — works without a custom domain) --------------
// Only used when Mailgun is not configured. Set RESEND_FROM to an address you
// verified on your Resend account, e.g. desirerawlings9@gmail.com.
export const resendApiKey = process.env.RESEND_API_KEY ?? "";
export const resendFrom = process.env.RESEND_FROM ?? "";

export const isResendConfigured = Boolean(resendApiKey && resendFrom);

// --- Gmail SMTP (free — delivers to ANY recipient, no domain needed) --------
// Google Account → Security → 2-Step Verification → App passwords (16 chars).
// GMAIL_USER is the Gmail address; GMAIL_FROM is optional (defaults to
// "Cnaz Foods <GMAIL_USER>"). Takes priority over Resend.
export const gmailUser = process.env.GMAIL_USER ?? "";
export const gmailAppPassword = process.env.GMAIL_APP_PASSWORD ?? "";
export const gmailFrom =
  process.env.GMAIL_FROM || (gmailUser ? `Cnaz Foods <${gmailUser}>` : "");

export const isGmailConfigured = Boolean(gmailUser && gmailAppPassword);

/** True when at least one email provider can actually send. */
export const isEmailConfigured =
  isMailgunConfigured || isGmailConfigured || isResendConfigured;

// --- Paystack (online payment — optional until keys are added) --------------
// Test mode: sk_test_… from paystack.com → Settings → API Keys & Webhooks.
// Live mode: sk_live_… (requires completed business details in Paystack).
export const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY ?? "";

export const isPaystackConfigured = paystackSecretKey.startsWith("sk_");
