/** Shared types for the Cnaz Foods shop. */

/** A product as shown in the UI (mapped from the `products` table). */
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

/** Row shape of `order_items`. */
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
