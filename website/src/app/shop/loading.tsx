import { ProductGridSkeleton } from "@/components/skeletons";

export default function ShopLoading() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="space-y-3" aria-hidden="true">
        <div className="h-9 w-64 animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-ink-100" />
      </div>
      <div className="mt-8">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
