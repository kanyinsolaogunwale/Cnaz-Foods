"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";

/**
 * "Delete account" trigger with the shared confirmation dialog (never a
 * single click — see AGENTS.md §6). On confirmation the account is removed
 * server-side, local state is cleared, and the customer lands on the home
 * page as a signed-out guest.
 */
export function DeleteAccountButton() {
  const { signOut } = useAuth();
  const { clear } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "We couldn't delete your account. Please try again.");
        setBusy(false);
        setOpen(false);
        return;
      }

      // Account deleted server-side — clear local state and head home.
      setOpen(false);
      clear();
      await signOut().catch(() => undefined);
      router.push("/?account-deleted=1");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
      setBusy(false);
      setOpen(false);
    }
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
        description="This permanently removes your profile, saved cart and sign-in. Orders you already placed stay with Cnaz Foods. This cannot be undone."
        confirmLabel={busy ? "Deleting…" : "Yes, delete my account"}
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
