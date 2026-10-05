import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderStatusChip } from "@/components/order-status-chip";
import { SetupNotice } from "@/components/setup-notice";
import { formatDateTime, formatNaira } from "@/lib/format";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Order history",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

type HistoryOrder = {
  id: string;
  reference: string;
  status: OrderStatus;
  total_naira: number;
  created_at: string;
  order_items?: { product_name: string; quantity: number }[];
};

export default async function OrderHistoryPage() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="container-page py-14">
        <SetupNotice title="Connect Supabase to see your orders" />
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/orders");

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, reference, status, total_naira, created_at, order_items ( product_name, quantity )",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[cnaz] Failed to load order history:", error.message);
  }
  const orders = (data ?? []) as HistoryOrder[];

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/account" className="hover:text-brand-700">
                Your account
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-ink-900">
              Order history
            </li>
          </ol>
        </nav>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
          Order history
        </h1>
        <p className="mt-3 text-ink-600">
          All the orders you&apos;ve placed with Cnaz Foods.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="card mx-auto max-w-lg p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            You haven&apos;t placed any orders yet
          </h2>
          <p className="mt-2 text-ink-600">
            Your orders will appear here once you place one.
          </p>
          <Link href="/shop" className="btn-primary mt-6">
            Browse our snacks
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-display text-lg font-semibold text-ink-900">
                      {order.reference}
                    </p>
                    <OrderStatusChip status={order.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink-600">
                    Placed on {formatDateTime(order.created_at)}
                  </p>
                  {order.order_items && order.order_items.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-ink-700">
                      {order.order_items.map((item, index) => (
                        <li key={index}>
                          {item.product_name} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="text-right">
                  <p className="font-semibold tabular-nums text-ink-900">
                    {formatNaira(order.total_naira)}
                  </p>
                  <Link
                    href={`/orders/${order.id}`}
                    className="mt-2 inline-block text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
