import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-20 text-center sm:py-28">
      <p className="font-display text-sm font-semibold uppercase tracking-widest text-brand-700">
        404
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-600">
        The page may have moved, or the link might be incorrect. Let&apos;s get you back to
        the snacks.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/shop" className="btn-primary">
          Shop our snacks
        </Link>
        <Link href="/" className="btn-secondary">
          Back home
        </Link>
      </div>
    </div>
  );
}
