import type { OrderStatus } from "@/lib/types";

/** Format an amount in Nigerian Naira, e.g. ₦2,300. */
export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

/** Format an ISO timestamp as e.g. "1 Oct 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format an ISO timestamp as e.g. "1 Oct 2026, 14:32". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  received: "Order received",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
