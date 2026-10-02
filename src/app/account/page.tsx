import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { OrderStatusChip } from "@/components/order-status-chip";
import { UserAvatar } from "@/components/user-avatar";
import { SignOutButton } from "@/components/sign-out-button";
import { SetupNotice } from "@/components/setup-notice";
import { formatDate, formatNaira } from "@/lib/format";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderRow, OrderStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

type RecentOrder = Pick<
  OrderRow,
  "id" | "reference" | "status" | "total_naira" | "created_at"
> & { order_items?: { product_name: string; quantity: number }[] };

export default async function AccountPage() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="container-page py-14">
        <SetupNotice title="Connect Supabase to use your account" />
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const [profileResult, recentOrdersResult, countResult] = await Promise.all([
    supabase.from("profiles").select("full_name, email, phone").eq("id", user.id).maybeSingle(),
    supabase
      .from("orders")
      .select(
        "id, reference, status, total_naira, created_at, order_items ( product_name, quantity )",
      )
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);

  const profile = profileResult.data;
  const orders = (recentOrdersResult.data ?? []) as RecentOrder[];
  const orderCount = countResult.count ?? 0;

  const displayName =
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "Cnaz Foods customer";
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;
  const email = profile?.email ?? user.email ?? "";

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
          Your account
        </h1>
        <p className="mt-3 text-ink-600">
          Manage your details and follow your Cnaz Foods orders.
        </p>
      </header>

      {/* Profile + quick links — one row, equal heights by grid stretch. */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Profile card */}
        <section className="card p-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={avatarUrl}
              name={displayName}
              className="h-14 w-14"
              textClassName="text-xl"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-ink-900">
                {displayName}
              </p>
              <p className="truncate text-sm text-ink-600">{email}</p>
            </div>
          </div>

          <p className="chip mt-4 border border-ink-200 bg-cream-50 text-ink-600">
            Signed in with Google
          </p>
        </section>

        <Link href="/account/orders" className="card flex flex-col justify-center p-5 transition-colors hover:border-brand-300">
          <p className="text-sm text-ink-600">Orders</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
            {orderCount}
          </p>
          <p className="mt-1 text-sm font-medium text-brand-700">View order history →</p>
        </Link>
        <Link href="/cart" className="card flex flex-col justify-center p-5 transition-colors hover:border-brand-300">
          <p className="text-sm text-ink-600">Your cart</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900">🛒</p>
          <p className="mt-1 text-sm font-medium text-brand-700">Go to cart →</p>
        </Link>
      </div>

      {/* Recent orders — full container width. */}
      <section className="card mt-4 overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-ink-200/80 px-5 py-4 sm:px-6">
              <h2 className="font-display text-lg font-semibold text-ink-900">
                Recent orders
              </h2>
              {orderCount > 0 ? (
                <Link
                  href="/account/orders"
                  className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                >
                  View all
                </Link>
              ) : null}
            </div>

            {orders.length === 0 ? (
              <div className="px-5 py-10 text-center sm:px-6">
                <p className="font-medium text-ink-900">No orders yet</p>
                <p className="mt-1 text-sm text-ink-600">
                  When you place an order, it will show up here.
                </p>
                <Link href="/shop" className="btn-primary mt-5">
                  Browse our snacks
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-ink-200/80">
                {orders.map((order) => (
                  <li key={order.id} className="px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink-900">{order.reference}</p>
                        <p className="mt-0.5 text-sm text-ink-600">
                          {formatDate(order.created_at)}
                          {order.order_items && order.order_items.length > 0
                            ? ` · ${order.order_items
                                .map((item) => `${item.product_name} ×${item.quantity}`)
                                .join(", ")}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <OrderStatusChip status={order.status as OrderStatus} />
                        <p className="font-semibold tabular-nums text-ink-900">
                          {formatNaira(order.total_naira)}
                        </p>
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

      {/* Account actions — deliberately last on the page, below every main
          flow, so signing out or deleting the account is a deliberate,
          hard-to-hit action (owner's design direction). */}
      <section
        aria-label="Account actions"
        className="card mt-8 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink-900">
              Account actions
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              Signing out keeps your saved cart. Deleting your account is
              permanent — it cannot be undone.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SignOutButton />
            <DeleteAccountButton />
          </div>
        </div>
      </section>
    </div>
  );
}
