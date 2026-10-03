"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

/**
 * "Delete account" trigger with the shared confirmation dialog (never a
 * single click — see AGENTS.md §6). Confirming does NOT delete anything:
 * it asks the server to email a secure deletion link, and the account is
 * only deleted when the customer opens that link and confirms on the
 * /delete-account page.
 */
export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        email?: string;
        error?: string;
      } | null;

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "We couldn't send the deletion link. Please try again.");
        setOpen(false);
        setBusy(false);
        return;
      }

      // Link requested. The account stays active until the emailed link is
      // opened and confirmed, so the customer stays signed in.
      setOpen(false);
      setBusy(false);
      setSentTo(data.email ?? "your email");
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
      setOpen(false);
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div
        role="status"
        className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-800"
      >
        <strong className="font-semibold">Check your inbox.</strong> We sent a
        deletion link to {sentTo}. Your account is only deleted when you open
        the link and confirm. The link expires in 60 minutes.
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="btn-danger-outline"
        aria-busy={busy}
      >
        Delete account
      </button>

      <ConfirmDialog
        open={open}
        title="Delete your account?"
        description="We'll email you a secure deletion link first. Nothing happens until you open that link in your email and confirm. The link expires in 60 minutes."
        confirmLabel={busy ? "Sending…" : "Email me the link"}
        cancelLabel="Keep my account"
        onConfirm={handleConfirm}
        onDismiss={() => {
          if (!busy) {
            setOpen(false);
            setError(null);
          }
        }}
      />

      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-accent-dark">
          {error}
        </p>
      ) : null}
    </>
  );
}
