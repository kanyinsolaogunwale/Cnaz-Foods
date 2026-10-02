import { sendOrderConfirmationEmail } from "@/lib/mailgun";
import type { EmailStatus } from "@/lib/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type CustomerInput = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state?: string;
  note?: string;
};

export type CreateOrderResult =
  | { ok: true; order: { id: string; reference: string; emailStatus: EmailStatus } }
  | { ok: false; status: number; error: string; fieldErrors?: Record<string, string> };

const MAX_QUANTITY = 99;
const MAX_DISTINCT_ITEMS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type ValidatedCustomer =
  | { value: CustomerInput; fieldErrors?: undefined }
  | { value?: undefined; fieldErrors: Record<string, string> };

/**
 * Server-side validation of checkout details. The client validates too, but
 * the server is the source of truth.
 */
export function validateCustomer(raw: unknown): ValidatedCustomer {
  const input = (raw ?? {}) as Record<string, unknown>;
  const fullName = asTrimmedString(input.fullName);
  const email = asTrimmedString(input.email).toLowerCase();
  const phone = asTrimmedString(input.phone);
  const address = asTrimmedString(input.address);
  const city = asTrimmedString(input.city);
  const state = asTrimmedString(input.state);
  const note = asTrimmedString(input.note);

  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2 || fullName.length > 80) {
    fieldErrors.fullName = "Please enter your full name (2–80 characters).";
  }
  if (!EMAIL_RE.test(email) || email.length > 120) {
    fieldErrors.email = "Please enter a valid email address.";
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15 || phone.length > 20) {
    fieldErrors.phone = "Please enter a valid phone number.";
  }
  if (address.length < 8 || address.length > 240) {
    fieldErrors.address = "Please enter a delivery address (at least 8 characters).";
  }
  if (city.length < 2 || city.length > 60) {
    fieldErrors.city = "Please enter your city or town.";
  }
  if (state.length > 60) {
    fieldErrors.state = "State / location is too long.";
  }
  if (note.length > 300) {
    fieldErrors.note = "Please keep the delivery note under 300 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  return {
    value: {
      fullName,
      email,
      phone,
      address,
      city,
      state: state || undefined,
      note: note || undefined,
    },
  };
}

/** e.g. CNZ-261001-7QK2 (date + 4 unambiguous characters). */
function makeOrderReference(): string {
  const now = new Date();
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CNZ-${ymd}-${suffix}`;
}

export function isOrderId(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Creates an order from validated checkout data:
 * 1. validates items + customer details,
 * 2. re-prices every line from the database (client prices are never trusted),
 * 3. inserts the order and its items (service role, server-side only),
 * 4. clears the signed-in customer's saved cart,
 * 5. sends the Mailgun confirmation email (failure never re-creates the order).
 */
export async function createOrder(input: {
  items: unknown;
  customer: unknown;
  userId: string | null;
}): Promise<CreateOrderResult> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      status: 503,
      error: "The shop database is not connected yet. Please try again later.",
    };
  }

  // --- items -------------------------------------------------------------
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, status: 400, error: "Your cart is empty." };
  }
  const quantities = new Map<string, number>();
  for (const raw of input.items) {
    const productId = asTrimmedString((raw as Record<string, unknown>)?.productId);
    const quantity = Math.floor(Number((raw as Record<string, unknown>)?.quantity));
    if (!productId || !Number.isFinite(quantity) || quantity < 1) {
      return {
        ok: false,
        status: 400,
        error: "Some cart items are invalid. Please review your cart and try again.",
      };
    }
    quantities.set(
      productId,
      Math.min(MAX_QUANTITY, (quantities.get(productId) ?? 0) + quantity),
    );
  }
  if (quantities.size > MAX_DISTINCT_ITEMS) {
    return { ok: false, status: 400, error: "Too many different items in one order." };
  }

  // --- customer ------------------------------------------------------------
  const customer = validateCustomer(input.customer);
  if (customer.fieldErrors) {
    return {
      ok: false,
      status: 400,
      error: "Please check the highlighted fields and try again.",
      fieldErrors: customer.fieldErrors,
    };
  }

  // --- re-price from the database ------------------------------------------
  const productIds = [...quantities.keys()];
  const { data: productRows, error: productsError } = await admin
    .from("products")
    .select("id, name, weight_label, price_naira, is_active")
    .in("id", productIds);

  if (productsError) {
    console.error("[cnaz] Failed to load products for order:", productsError.message);
    return { ok: false, status: 500, error: "We couldn't reach our catalogue. Please try again." };
  }

  const activeProducts = new Map(
    (productRows ?? []).filter((p) => p.is_active).map((p) => [p.id, p]),
  );
  if (activeProducts.size !== productIds.length) {
    return {
      ok: false,
      status: 409,
      error: "Some items in your cart are no longer available. Please refresh your cart and try again.",
    };
  }

  const orderItems = productIds.map((productId) => {
    const product = activeProducts.get(productId)!;
    const quantity = quantities.get(productId)!;
    return {
      product_id: product.id,
      product_name: product.name,
      product_weight: product.weight_label,
      unit_price_naira: product.price_naira,
      quantity,
      line_total_naira: product.price_naira * quantity,
    };
  });
  const subtotal = orderItems.reduce((sum, item) => sum + item.line_total_naira, 0);
  // Delivery pricing is confirmed with the customer after the order — see AGENTS.md.
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  // --- insert order + items -------------------------------------------------
  let order: { id: string; reference: string } | null = null;
  let insertError: { message?: string; code?: string } | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
    const reference = makeOrderReference();
    const { data, error } = await admin
      .from("orders")
      .insert({
        reference,
        user_id: input.userId,
        customer_name: customer.value.fullName,
        customer_email: customer.value.email,
        customer_phone: customer.value.phone,
        delivery_address: customer.value.address,
        city: customer.value.city,
        state: customer.value.state ?? null,
        note: customer.value.note ?? null,
        subtotal_naira: subtotal,
        delivery_fee_naira: deliveryFee,
        total_naira: total,
        status: "received",
        email_status: "pending",
      })
      .select("id, reference")
      .single();

    if (!error && data) {
      order = data;
    } else {
      insertError = error;
      // Retry only on a duplicate reference collision.
      if (error?.code !== "23505") break;
    }
  }

  if (!order) {
    console.error("[cnaz] Order insert failed:", insertError?.message);
    return { ok: false, status: 500, error: "We couldn't save your order. Please try again." };
  }

  const { error: itemsInsertError } = await admin
    .from("order_items")
    .insert(orderItems.map((item) => ({ ...item, order_id: order!.id })));

  if (itemsInsertError) {
    // Remove the incomplete order so no half-saved order is left behind.
    await admin.from("orders").delete().eq("id", order.id);
    console.error("[cnaz] Order items insert failed:", itemsInsertError.message);
    return { ok: false, status: 500, error: "We couldn't save your order items. Please try again." };
  }

  // --- clear the signed-in customer's saved cart -----------------------------
  if (input.userId) {
    const { data: cart } = await admin
      .from("carts")
      .select("id")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (cart) {
      await admin.from("cart_items").delete().eq("cart_id", cart.id);
    }
  }

  // --- send the confirmation email -------------------------------------------
  // The order is already saved: an email failure is recorded on the order and
  // shown on the confirmation page — a second order is never created.
  let emailStatus: EmailStatus = "skipped";
  try {
    emailStatus = await sendOrderConfirmationEmail({
      order: {
        id: order.id,
        reference: order.reference,
        customerName: customer.value.fullName,
        customerEmail: customer.value.email,
        customerPhone: customer.value.phone,
        address: customer.value.address,
        city: customer.value.city,
        state: customer.value.state ?? null,
        note: customer.value.note ?? null,
        subtotal,
        deliveryFee,
        total,
      },
      items: orderItems,
    });
  } catch (error) {
    console.error("[cnaz] Unexpected error while sending confirmation email:", error);
    emailStatus = "failed";
  }
  await admin.from("orders").update({ email_status: emailStatus }).eq("id", order.id);

  return { ok: true, order: { id: order.id, reference: order.reference, emailStatus } };
}
