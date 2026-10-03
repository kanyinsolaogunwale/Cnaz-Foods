"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Phase = "confirm" | "working" | "deleted" | "error";

/**
 * The emailed link lands here with a signed token. Nothing is deleted until
 * the customer presses the confirm button, which POSTs the token to
 * `/api/account/delete/confirm` (a plain GET can never delete anything, so
 * email link previews and scanners are harmless).
 */
export function ConfirmDeletion() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [phase, setPhase] = useState<Phase>(() => (token ? "confirm" : "error"));
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    token ? null : "This deletion link is invalid or was already used.",
  );

  const handleConfirm = useCallback(async () => {
    if (!token || phase === "working") return;
    setPhase("working");
    try {
      const response = await fetch("/api/account/delete/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (response.ok && data?.ok) {
        // The account is gone server-side; clear this browser's stale session.
        void getSupabaseBrowserClient()
          ?.auth.signOut()
          .catch(() => undefined);
        setPhase("deleted");
        return;
      }

      setErrorMessage(
        data?.error ?? "We couldn't delete your account right now. Please try again.",
      );
      setPhase("error");
    } catch {
      setErrorMessage("We couldn't reach the server. Please check your connection and try again.");
      setPhase("error");
    }
  }, [phase, token]);

  if (phase === "deleted") {
    return (
      <div className="card w-full max-w-md animate-fade-in p-6 text-center sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-2xl">
          🌱
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold text-ink-900">
          Your account has been deleted
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
          Everything is done. We emailed you a receipt, and your snacks will be
          here whenever you come back.
        </p>
        <Link href="/?account-deleted=1" className="btn-primary mt-6 w-full py-3">
          Back to the shop
        </Link>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="card w-full max-w-md animate-fade-in p-6 text-center sm:p-8">
        <h1 className="font-display text-xl font-semibold text-ink-900">
          We couldn&apos;t confirm that link
        </h1>
        <p role="alert" className="mt-2 text-[15px] leading-relaxed text-ink-600">
          {errorMessage}
        </p>
        <p className="mt-2 text-sm text-ink-500">
          You can request a fresh link from your account page at any time.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link href="/account" className="btn-primary py-3">
            Go to your account
          </Link>
          <Link href="/" className="btn-secondary py-3">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md animate-fade-in p-6 text-center sm:p-8">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-2xl">
        ⚠️
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-ink-900">
        Delete your account?
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
        This permanently removes your profile, saved cart and sign-in. Orders
        you already placed stay with Cnaz Foods. This cannot be undone.
      </p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={phase === "working"}
          className="btn-danger py-3"
          aria-busy={phase === "working"}
        >
          {phase === "working" ? "Deleting…" : "Yes, delete my account"}
        </button>
        <Link href="/account" className="btn-secondary py-3">
          Keep my account
        </Link>
      </div>
    </div>
  );
}
