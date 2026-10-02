import { orderStatusLabels } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  received: "border border-brand-200 bg-brand-50 text-brand-800",
  confirmed: "bg-brand-600 text-white",
  delivered: "bg-ink-900 text-white",
  cancelled: "border border-accent/30 bg-accent-soft text-accent-dark",
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return (
    <span className={`chip ${STATUS_CLASSES[status] ?? STATUS_CLASSES.received}`}>
      {orderStatusLabels[status] ?? status}
    </span>
  );
}
