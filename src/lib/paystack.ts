/**
 * Paystack integration — plain `fetch`, no SDK. SERVER ONLY.
 *
 * The customer pays the order's snack total online (delivery is confirmed by
 * phone separately). Every write to `orders` payment fields happens on the
 * server after Paystack confirms the charge — client values are never trusted.
 *
 * Test mode works with a `sk_test_…` secret key and Paystack test cards; no
 * business registration is needed until live keys are used.
 */
import { isPaystackConfigured, paystackSecretKey } from "@/lib/env.server";

const PAYSTACK_API = "https://api.paystack.co";

/** Payment is available only when a secret key is configured. */
export function isPaymentEnabled(): boolean {
  return isPaystackConfigured;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${paystackSecretKey}`,
    "Content-Type": "application/json",
  };
}

export type InitializeResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; error: string };

/**
 * Starts a Paystack transaction for an order. The generated reference is
 * unique per attempt (so retries never collide) and is stored on the order
 * by the caller. Returns the hosted payment page URL to redirect to.
 */
export async function initializePayment(input: {
  email: string;
  amountNaira: number;
  orderReference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<InitializeResult> {
  if (!isPaystackConfigured) {
    return { ok: false, error: "Online payment is not set up yet." };
  }
  if (!Number.isInteger(input.amountNaira) || input.amountNaira < 1) {
    return { ok: false, error: "Invalid payment amount." };
  }

  // Paystack references must be unique per attempt — suffix the order ref.
  const reference = `${input.orderReference}-${Date.now().toString(36).toUpperCase()}`;

  try {
    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        email: input.email,
        amount: input.amountNaira * 100, // Paystack expects kobo
        reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const payload = (await response.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    } | null;

    if (!response.ok || !payload?.status || !payload.data?.authorization_url) {
      console.error(
        `[cnaz] Paystack initialize failed (${response.status}):`,
        payload?.message ?? "unknown error",
      );
      return { ok: false, error: "We couldn't start the payment. Please try again." };
    }

    return {
      ok: true,
      authorizationUrl: payload.data.authorization_url,
      reference: payload.data.reference ?? reference,
    };
  } catch (error) {
    console.error("[cnaz] Paystack initialize request failed:", error);
    return { ok: false, error: "We couldn't reach the payment provider. Please try again." };
  }
}

export type VerifyResult =
  | {
      ok: true;
      outcome: "success" | "failed" | "pending";
      amountKobo: number;
      paidAt: string | null;
    }
  | { ok: false; error: string };

/**
 * Asks Paystack for the true state of a charge. Callers must compare
 * `amountKobo` against the order total before marking anything paid.
 */
export async function verifyPayment(reference: string): Promise<VerifyResult> {
  if (!isPaystackConfigured) {
    return { ok: false, error: "Online payment is not set up yet." };
  }

  try {
    const response = await fetch(
      `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: authHeaders(),
        signal: AbortSignal.timeout(15000),
      },
    );

    const payload = (await response.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: { status?: string; amount?: number; paid_at?: string | null };
    } | null;

    if (!response.ok || !payload?.status || !payload.data) {
      console.error(
        `[cnaz] Paystack verify failed (${response.status}):`,
        payload?.message ?? "unknown error",
      );
      return { ok: false, error: "We couldn't confirm the payment. Please try again." };
    }

    const status = payload.data.status;
    const outcome =
      status === "success" ? "success" : status === "abandoned" || status === "ongoing" ? "pending" : "failed";

    return {
      ok: true,
      outcome,
      amountKobo: payload.data.amount ?? 0,
      paidAt: payload.data.paid_at ?? null,
    };
  } catch (error) {
    console.error("[cnaz] Paystack verify request failed:", error);
    return { ok: false, error: "We couldn't reach the payment provider. Please try again." };
  }
}

/**
 * Validates a Paystack webhook signature (HMAC SHA-512 of the raw body with
 * the secret key). Returns false for missing/invalid signatures — such
 * requests are never trusted.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!isPaystackConfigured || !signatureHeader) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha512", paystackSecretKey).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
