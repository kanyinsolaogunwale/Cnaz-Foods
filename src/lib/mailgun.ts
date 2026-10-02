import type { EmailStatus } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { site } from "@/lib/site";
import {
  isMailgunConfigured,
  isResendConfigured,
  mailgunApiKey,
  mailgunDomain,
  mailgunFrom,
  resendApiKey,
  resendFrom,
} from "@/lib/env.server";

export type OrderEmailData = {
  order: {
    id: string;
    reference: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    address: string;
    city: string;
    state?: string | null;
    note?: string | null;
    subtotal: number;
    deliveryFee: number;
    total: number;
  };
  items: {
    product_name: string;
    product_weight: string | null;
    unit_price_naira: number;
    quantity: number;
    line_total_naira: number;
  }[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Builds the branded HTML + plain-text confirmation email. */
export function buildOrderConfirmationEmail(data: OrderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { order, items } = data;
  const orderUrl = `${site.url}/orders/${order.id}`;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #ECEDE8;font-size:14px;color:#16210F;">
          <strong>${escapeHtml(item.product_name)}</strong>${
            item.product_weight ? ` <span style="color:#6B7464;">· ${escapeHtml(item.product_weight)}</span>` : ""
          }<br />
          <span style="color:#6B7464;font-size:13px;">Qty ${item.quantity} × ${formatNaira(item.unit_price_naira)}</span>
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid #ECEDE8;font-size:14px;color:#16210F;white-space:nowrap;">
          ${formatNaira(item.line_total_naira)}
        </td>
      </tr>`,
    )
    .join("");

  const deliveryLines = [
    order.customerName,
    order.customerPhone,
    order.address,
    [order.city, order.state].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(String(line)))
    .join("<br />");

  const contactLines = [
    site.phone ? `Phone: ${site.phone}` : "",
    site.email ? `Email: ${site.email}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const subject = `Order ${order.reference} confirmed — Cnaz Foods`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F6F3EA;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3EA;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
            <tr>
              <td style="background:#0B0F08;border-radius:12px 12px 0 0;padding:24px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;">
                      <img src="${site.url}/images/logo-cn.png" width="44" height="44" alt="Cnaz Foods logo" style="border-radius:8px;display:block;" />
                      <div style="color:#FFFFFF;font-size:18px;font-weight:bold;margin-top:10px;">Cnaz Foods</div>
                      <div style="color:#AED876;font-size:12px;margin-top:2px;">Quick bite, endless delight.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#FFFFFF;padding:28px;font-family:Arial,Helvetica,sans-serif;">
                <h1 style="margin:0;font-size:20px;color:#16210F;">Order confirmed 🎉</h1>
                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#3A4632;">
                  Hi ${escapeHtml(order.customerName)},<br />
                  Thank you for your order — we've received it and we're getting your snacks ready.
                </p>
                <p style="margin:16px 0 0;font-size:14px;color:#3A4632;">
                  Order number: <strong style="color:#16210F;">${escapeHtml(order.reference)}</strong>
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                  ${itemRows}
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-size:14px;color:#16210F;">
                  <tr>
                    <td style="padding:6px 0;color:#3A4632;">Subtotal</td>
                    <td align="right" style="padding:6px 0;">${formatNaira(order.subtotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#3A4632;">Delivery</td>
                    <td align="right" style="padding:6px 0;">${
                      order.deliveryFee > 0 ? formatNaira(order.deliveryFee) : "To be confirmed"
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 0;font-weight:bold;font-size:16px;">Total</td>
                    <td align="right" style="padding:10px 0 0;font-weight:bold;font-size:16px;">${formatNaira(order.total)}</td>
                  </tr>
                </table>
                <div style="margin-top:24px;background:#F6F3EA;border-radius:12px;padding:16px 18px;font-size:13px;line-height:1.7;color:#3A4632;">
                  <strong style="color:#16210F;">Delivery details</strong><br />
                  ${deliveryLines}${order.note ? `<br /><em>Note: ${escapeHtml(order.note)}</em>` : ""}
                </div>
                <div style="margin-top:20px;font-size:13px;line-height:1.7;color:#3A4632;">
                  <strong style="color:#16210F;">What happens next</strong>
                  <ol style="margin:8px 0 0;padding-left:18px;">
                    <li>We review your order.</li>
                    <li>We contact you on ${escapeHtml(order.customerPhone)} to confirm delivery and payment.</li>
                    <li>Your snacks are packed and on their way.</li>
                  </ol>
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="background:#4A811C;border-radius:10px;">
                      <a href="${orderUrl}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;">View your order</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#F0F1EC;border-radius:0 0 12px 12px;padding:18px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7464;">
                ${contactLines ? `${contactLines}<br />` : ""}
                You received this email because you placed an order with Cnaz Foods.<br />
                Cnaz Foods — Quick bite, endless delight.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `CNAS FOODS — Quick bite, endless delight.`,
    ``,
    `Order confirmed`,
    ``,
    `Hi ${order.customerName},`,
    `Thank you for your order — we've received it and we're getting your snacks ready.`,
    ``,
    `Order number: ${order.reference}`,
    ``,
    `Items:`,
    ...items.map(
      (item) =>
        `- ${item.product_name}${item.product_weight ? ` (${item.product_weight})` : ""} — Qty ${item.quantity} × ${formatNaira(item.unit_price_naira)} = ${formatNaira(item.line_total_naira)}`,
    ),
    ``,
    `Subtotal: ${formatNaira(order.subtotal)}`,
    `Delivery: ${order.deliveryFee > 0 ? formatNaira(order.deliveryFee) : "To be confirmed"}`,
    `Total: ${formatNaira(order.total)}`,
    ``,
    `Delivery details:`,
    `${order.customerName}, ${order.customerPhone}`,
    order.address,
    [order.city, order.state].filter(Boolean).join(", "),
    order.note ? `Note: ${order.note}` : "",
    ``,
    `What happens next:`,
    `1. We review your order.`,
    `2. We contact you on ${order.customerPhone} to confirm delivery and payment.`,
    `3. Your snacks are packed and on their way.`,
    ``,
    `View your order: ${orderUrl}`,
    contactLines ? `\n${contactLines}` : "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject, html, text };
}

/**
 * Sends the order confirmation email through Mailgun (primary) or Resend
 * (fallback). Returns "sent", "failed" (provider rejected/errored) or
 * "skipped" (no provider configured). It never throws, and it never blocks
 * order creation — the order is saved first.
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<EmailStatus> {
  const { subject, html, text } = buildOrderConfirmationEmail(data);

  if (isMailgunConfigured) {
    try {
      const body = new URLSearchParams({
        from: mailgunFrom,
        to: data.order.customerEmail,
        subject,
        text,
        html,
      });

      const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error(
          `[cnaz] Mailgun responded with ${response.status}: ${detail.slice(0, 300)}`,
        );
        return "failed";
      }
      return "sent";
    } catch (error) {
      console.error("[cnaz] Mailgun request failed:", error);
      return "failed";
    }
  }

  if (isResendConfigured) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [data.order.customerEmail],
          subject,
          html,
          text,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error(
          `[cnaz] Resend responded with ${response.status}: ${detail.slice(0, 300)}`,
        );
        return "failed";
      }
      return "sent";
    } catch (error) {
      console.error("[cnaz] Resend request failed:", error);
      return "failed";
    }
  }

  console.warn("[cnaz] No email provider is configured — skipping confirmation email.");
  return "skipped";
}
