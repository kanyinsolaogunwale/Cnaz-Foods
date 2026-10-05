"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleIcon } from "@/components/google-icon";
import { SetupNotice } from "@/components/setup-notice";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Sign-in was cancelled. You can try again whenever you're ready.",
  auth: "We couldn't sign you in. Please try again.",
  setup: "Sign-in isn't configured yet. Please add your Supabase and Google credentials first.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LoginPanel({
  error,
  next,
  appRedirect,
  configured,
}: {
  error?: string;
  next: string;
  /** Present when the Cnaz Foods mobile app started this sign-in. */
  appRedirect?: string | null;
  configured: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  /** Email/password sign-in (accounts created in the Cnaz Foods mobile app). */
  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setLocalError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Please enter your password (at least 6 characters).");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLocalError("Sign-in isn't configured yet.");
      return;
    }
    setBusy(true);
    setLocalError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (signInError) {
      setLocalError(
        signInError.message === "Invalid login credentials"
          ? "That email and password don't match an account. Please try again."
          : signInError.message === "Email not confirmed"
            ? "Please confirm your email first (check your inbox for the link)."
            : "We couldn't sign you in. Please try again.",
      );
      setBusy(false);
      return;
    }
    // The client cart context picks up the new session, merges any guest cart,
    // and persists it to Supabase. When the mobile app started this sign-in,
    // hand the fresh session back to the app instead of browsing further.
    if (appRedirect) {
      router.push(`/auth/app-return?redirect=${encodeURIComponent(appRedirect)}`);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLocalError("Sign-in isn't configured yet.");
      return;
    }
    setBusy(true);
    setLocalError(null);

    // Google lands back on /auth/callback; from there the customer continues
    // to the app's return bridge (mobile sign-in) or the requested page.
    const bridgeNext = appRedirect
      ? `/auth/app-return?redirect=${encodeURIComponent(appRedirect)}`
      : next;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(bridgeNext)}`;
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
        Sign in to track your orders and keep your cart saved to your account.
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

      <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-ink-500">
        <span className="h-px flex-1 bg-ink-200" />
        or with email
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="label">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
        </div>
        <div>
          <label htmlFor="login-password" className="label">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="input"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-ink-500">
        Accounts created in the Cnaz Foods mobile app sign in here with the same email and
        password. We only use your name and email to manage your orders.
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
