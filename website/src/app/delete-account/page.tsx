import { Suspense } from "react";
import { ConfirmDeletion } from "./confirm-deletion";

export const metadata = {
  title: "Confirm account deletion · Cnaz Foods",
  description: "Confirm the deletion of your Cnaz Foods account.",
};

/**
 * Step 2 of email-confirmed account deletion. Lives OUTSIDE /account/* so
 * the emailed link works even when the customer is already signed out.
 */
export default function DeleteAccountPage() {
  return (
    <main className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <Suspense
        fallback={
          <div className="card w-full max-w-md animate-fade-in p-6 text-center sm:p-8" aria-hidden="true">
            <div className="mx-auto h-6 w-40 rounded bg-ink-200" />
            <div className="mx-auto mt-4 h-4 w-full rounded bg-ink-100" />
            <div className="mx-auto mt-2 h-4 w-2/3 rounded bg-ink-100" />
          </div>
        }
      >
        <ConfirmDeletion />
      </Suspense>
    </main>
  );
}
