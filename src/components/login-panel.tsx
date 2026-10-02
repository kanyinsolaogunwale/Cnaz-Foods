"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { GoogleIcon } from "@/components/google-icon";
import { SetupNotice } from "@/components/setup-notice";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Sign-in was cancelled. You can try again whenever you're ready.",
  auth: "We couldn't sign you in. Please try again.",
  setup: "Sign-in isn't configured yet. Please add your Supabase and Google credentials first.",
};

export function LoginPanel({
  error,
  next,
  configured,
}: {
  error?: string;
  next: string;
  configured: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLocalError("Sign-in isn't configured yet.");
      return;
    }
    setBusy(true);
    setLocalError(null);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });

    if (signInError) {
      setLocalError(ERROR_MESSAGES.auth);
      setBusy(false);
    }
    // On success the browser redirects to Google, then back to /auth/callback.
  }

  if (!configured) {
    return <SetupNotice title="Connect Supabase to enable Google sign-in" />;
  }

  const message = localError ?? (error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth : null);

  return (
    <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
      <Image
        src="/images/logo-cn.png"
        alt="Cnaz Foods logo"
        width={56}
        height={56}
        className="h-14 w-14 rounded-xl"
      />
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink-900">
        Welcome to Cnaz Foods
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
        Sign in with Google to track your orders and keep your cart saved to your account.
      </p>

      {message ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-medium text-accent-dark"
        >
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={busy}
        aria-busy={busy}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-ink-200 bg-white px-5 py-3.5 text-[15px] font-semibold text-ink-900 shadow-soft transition-colors hover:bg-ink-100/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {busy ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      <p className="mt-5 text-xs leading-relaxed text-ink-500">
        We only use your Google name and email to manage your orders — nothing else, and
        never anything posted on your behalf.
      </p>

      <div className="mt-6 border-t border-ink-200 pt-5">
        <Link
          href="/shop"
          className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
        >
          Continue shopping without signing in →
        </Link>
      </div>
    </div>
  );
}
