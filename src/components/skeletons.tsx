export function ProductGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card overflow-hidden">
          <div className="stage aspect-square" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-ink-100" />
            <div className="h-11 animate-pulse rounded-xl bg-ink-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card space-y-3 p-5">
          <div className="h-4 w-1/3 animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
        </div>
      ))}
    </div>
  );
}

export function PageHeadingSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-8 w-56 animate-pulse rounded bg-ink-100" />
      <div className="h-4 w-80 animate-pulse rounded bg-ink-100" />
    </div>
  );
}
