"use client";

/**
 * App-return bridge — the last hop of the mobile app's Google sign-in.
 *
 * The mobile app opens the website's /login page inside an auth browser and
 * passes `app_redirect` (its deep link or web origin). Once Google sign-in
 * finishes on the website, this page reads the fresh session and hands the
 * tokens to the app:
 *
 *   <app_redirect>#access_token=…&refresh_token=…
 *
 * The fragment never touches a server; the app's own Supabase client applies
 * it locally. The redirect target is validated with safeAppRedirect() both
 * here and in the /login page.
 */
import { useEffect, useState } from "react";
import { safeAppRedirect } from "@/lib/app-redirect";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ReturnState = { status: "working" } | { status: "error"; message: string } | { status: "ready"; href: string };

export default function AppReturnPage() {
  const [state, setState] = useState<ReturnState>({ status: "working" });

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const redirect = safeAppRedirect(params.get("redirect"));
      if (!redirect) {
        setState({ status: "error", message: "This return link is invalid. Please start sign-in from the Cnaz Foods app again." });
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setState({ status: "error", message: "Sign-in isn't configured yet. Please try again later." });
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      const session = data.session;
      if (error || !session) {
        setState({
          status: "error",
          message: "We couldn't find your new session. Please start sign-in from the Cnaz Foods app again.",
        });
        return;
      }

      // supabase-js's detectSessionInUrl requires the FULL implicit-flow
      // fragment (access_token, expires_in, refresh_token, token_type) —
      // anything less is rejected and the hash is discarded.
      const fragment = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: String(session.expires_in ?? 3600),
        token_type: session.token_type ?? "bearer",
        ...(typeof session.expires_at === "number" ? { expires_at: String(session.expires_at) } : {}),
      });
      const href = `${redirect}#${fragment.toString()}`;
      setState({ status: "ready", href });
      // Hand the session back to the app. If the OS cannot open the target
      // (e.g. the page is open in a normal desktop browser tab), the visible
      // fallback link below still lets the user return.
      window.location.replace(href);
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 px-6 py-14">
      <div className="card w-full max-w-sm p-8 text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"
        >
          {state.status === "error" ? "!" : <span className="block h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />}
        </span>
        <h1 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink-900">
          {state.status === "error" ? "Sign-in couldn't return" : "Returning to the app"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          {state.status === "error"
            ? state.message
            : "Your sign-in was successful. You can close this page once the app opens."}
        </p>
        {state.status === "ready" ? (
          <a
            href={state.href}
            className="mt-6 inline-block text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Tap here if nothing happens
          </a>
        ) : null}
        {state.status === "error" ? (
          <a
            href="/login"
            className="mt-6 inline-block text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Back to sign-in
          </a>
        ) : null}
      </div>
    </div>
  );
}
