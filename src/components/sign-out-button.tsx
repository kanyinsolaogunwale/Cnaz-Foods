"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAuth } from "@/context/auth-context";

/**
 * Sign-out with a confirmation step (never a single accidental tap —
 * AGENTS.md §6). Nothing is lost by signing out: the cart and order
 * history survive for the next sign-in.
 */
export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="btn-secondary"
        aria-busy={busy}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>

      <ConfirmDialog
        open={open}
        title="Sign out of your account?"
        description="You can sign back in with Google anytime — your cart and order history will be waiting for you."
        confirmLabel={busy ? "Signing out…" : "Yes, sign out"}
        onConfirm={handleConfirm}
        onDismiss={() => {
          if (!busy) setOpen(false);
        }}
      />
    </>
  );
}
