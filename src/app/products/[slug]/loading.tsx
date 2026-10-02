export default function ProductLoading() {
  return (
    <div className="container-page py-8 sm:py-12" aria-hidden="true">
      <div className="h-4 w-56 animate-pulse rounded bg-ink-100" />
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="stage aspect-square animate-pulse rounded-3xl" />
        <div className="space-y-4">
          <div className="h-9 w-3/4 animate-pulse rounded bg-ink-100" />
          <div className="h-6 w-32 animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100" />
          <div className="h-12 w-52 animate-pulse rounded-xl bg-ink-100" />
        </div>
      </div>
    </div>
  );
}
