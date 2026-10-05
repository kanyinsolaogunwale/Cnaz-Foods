import { OrderListSkeleton, PageHeadingSkeleton } from "@/components/skeletons";

export default function OrderHistoryLoading() {
  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeadingSkeleton />
      <div className="mt-8">
        <OrderListSkeleton count={3} />
      </div>
    </div>
  );
}
