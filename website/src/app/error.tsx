"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cnaz] Page error:", error);
  }, [error]);

  return (
    <div className="container-page py-20 text-center sm:py-28">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-600">
        Sorry about that. The page couldn&apos;t load. You can try again, or head back to
        the shop.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Back home
        </Link>
      </div>
    </div>
  );
}
