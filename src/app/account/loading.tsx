import { OrderListSkeleton, PageHeadingSkeleton } from "@/components/skeletons";

export default function AccountLoading() {
  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeadingSkeleton />
      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="card h-64 animate-pulse" />
        <OrderListSkeleton />
      </div>
    </div>
  );
}
