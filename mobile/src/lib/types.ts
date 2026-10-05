/**
 * Typed shared models for the Cnaz Foods mobile app. These mirror the
 * website's src/lib/types.ts and the Supabase schema — one backend, one truth.
 */

/** A product as served by GET /api/products (same shape as the website). */
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  taste: string | null;
  ingredients: string[] | null;
  weightLabel: string;
  priceNaira: number;
  imageUrl: string;
  isFeatured: boolean;
  sortOrder: number;
};

/** One line in the cart. */
export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  weightLabel: string;
  priceNaira: number;
  imageUrl: string;
  quantity: number;
};

export type OrderStatus = "received" | "confirmed" | "delivered" | "cancelled";
export type EmailStatus = "pending" | "sent" | "failed" | "skipped";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

/** Row shape of `order_items` (snapshot of name/weight/price at purchase). */
export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_weight: string | null;
  unit_price_naira: number;
  quantity: number;
  line_total_naira: number;
};

/** Row shape of `orders` (optionally with its items joined). */
export type OrderRow = {
  id: string;
  reference: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  city: string;
  state: string | null;
  note: string | null;
  subtotal_naira: number;
  delivery_fee_naira: number;
  total_naira: number;
  status: OrderStatus;
  email_status: EmailStatus;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
  order_items?: OrderItemRow[];
};

/** Product images are relative paths from the website's /public directory. */
export function productImageUrl(websiteUrl: string, imageUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${websiteUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

/** Format an amount in Nigerian Naira, e.g. ₦2,300 (same rules as the site). */
export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
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
