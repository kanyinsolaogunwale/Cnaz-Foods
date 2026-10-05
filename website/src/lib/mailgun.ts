import nodemailer from "nodemailer";
import type { EmailStatus } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { site } from "@/lib/site";
import {
  gmailAppPassword,
  gmailFrom,
  gmailUser,
  isGmailConfigured,
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
    paymentStatus?: string;
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

  const subject = `Order ${order.reference} confirmed · Cnaz Foods`;

  const totalRowHtml =
    order.paymentStatus === "paid"
      ? `\n                  <tr>\n                    <td style="padding:6px 0;color:#3A4632;">Payment</td>\n                    <td align="right" style="padding:6px 0;color:#4A811C;font-weight:bold;">Paid ✓</td>\n                  </tr>\n                  <tr>\n                    <td style="padding:10px 0 0;font-weight:bold;font-size:16px;">Total paid</td>\n                    <td align="right" style="padding:10px 0 0;font-weight:bold;font-size:16px;">${formatNaira(order.total)}</td>\n                  </tr>`
      : `\n                  <tr>\n                    <td style="padding:10px 0 0;font-weight:bold;font-size:16px;">Total</td>\n                    <td align="right" style="padding:10px 0 0;font-weight:bold;font-size:16px;">${formatNaira(order.total)}</td>\n                  </tr>`;

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
                    <td style="width:64px;vertical-align:middle;">
                      <img src="${site.url}/images/logo-cn.png" width="56" height="56" alt="Cnaz Foods logo" style="border-radius:12px;display:block;border:1px solid rgba(255,255,255,0.15);" />
                    </td>
                    <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;padding-left:16px;">
                      <div style="color:#FFFFFF;font-size:19px;font-weight:bold;">Cnaz Foods</div>
                      <div style="color:#AED876;font-size:12px;margin-top:3px;">Quick bite, endless delight.</div>
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
                  Thank you for your order. We've received it and we're getting your snacks ready.
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
                  ${totalRowHtml}
                </table>
                <div style="margin-top:24px;background:#F6F3EA;border-radius:12px;padding:16px 18px;font-size:13px;line-height:1.7;color:#3A4632;">
                  <strong style="color:#16210F;">Delivery details</strong><br />
                  ${deliveryLines}${order.note ? `<br /><em>Note: ${escapeHtml(order.note)}</em>` : ""}
                </div>
                <div style="margin-top:20px;font-size:13px;line-height:1.7;color:#3A4632;">
                  <strong style="color:#16210F;">What happens next</strong>
                  <ol style="margin:8px 0 0;padding-left:18px;">
                    <li>We review your order.</li>
                    <li>We contact you on ${escapeHtml(order.customerPhone)} to arrange delivery${order.paymentStatus === "paid" ? "" : " and payment"}.</li>
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
                Cnaz Foods. Quick bite, endless delight.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `CNAZ FOODS. Quick bite, endless delight.`,
    ``,
    `Order confirmed`,
    ``,
    `Hi ${order.customerName},`,
    `Thank you for your order. We've received it and we're getting your snacks ready.`,
    ``,
    `Order number: ${order.reference}`,
    ``,
    `Items:`,
    ...items.map(
      (item) =>
        `- ${item.product_name}${item.product_weight ? ` (${item.product_weight})` : ""}: Qty ${item.quantity} × ${formatNaira(item.unit_price_naira)} = ${formatNaira(item.line_total_naira)}`,
    ),
    ``,
    `Subtotal: ${formatNaira(order.subtotal)}`,
    `Delivery: ${order.deliveryFee > 0 ? formatNaira(order.deliveryFee) : "To be confirmed"}`,
    order.paymentStatus === "paid" ? `Payment: Paid. Thank you!` : `Payment: to be arranged with you`,
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

type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Sends a message through Mailgun (primary) or Resend (fallback). Returns
 * "sent", "failed" (provider rejected/errored) or "skipped" (no provider
 * configured). It never throws, and it never blocks the calling flow —
 * callers record the returned status and continue.
 */
async function sendViaConfiguredProvider(email: OutgoingEmail): Promise<EmailStatus> {
  const { subject, html, text } = email;

  if (isGmailConfigured) {
    try {
      // Gmail's SMTP accepts an app password and delivers to any recipient —
      // the free path while the business has no sending domain.
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailAppPassword },
        connectionTimeout: 15000,
      });

      await transporter.sendMail({
        from: gmailFrom,
        to: email.to,
        subject,
        text,
        html,
      });
      return "sent";
    } catch (error) {
      console.error("[cnaz] Gmail SMTP send failed:", error);
      return "failed";
    }
  }

  if (isMailgunConfigured) {
    try {
      const body = new URLSearchParams({
        from: mailgunFrom,
        to: email.to,
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
          to: [email.to],
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

  console.warn("[cnaz] No email provider is configured — skipping email.");
  return "skipped";
}

/**
 * Sends the order confirmation email. The order is always saved first —
 * this never blocks order creation and never re-creates an order.
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<EmailStatus> {
  const { subject, html, text } = buildOrderConfirmationEmail(data);
  return sendViaConfiguredProvider({ to: data.order.customerEmail, subject, html, text });
}

// ---------------------------------------------------------------------------
//  Welcome email — one-time, sent after a customer's first Google sign-in.
// ---------------------------------------------------------------------------

export type WelcomeEmailData = {
  name?: string | null;
  email: string;
};

/** Builds the branded "your account is ready" email for new customers. */
export function buildWelcomeEmail(data: WelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = (data.name ?? "").trim().split(/\s+/)[0] ?? "";
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi there,";
  const shopUrl = `${site.url}/shop`;

  const contactLines = [
    site.phone ? `Phone: ${site.phone}` : "",
    site.email ? `Email: ${site.email}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const subject = `Welcome to Cnaz Foods 🎉`;

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
                    <td style="width:64px;vertical-align:middle;">
                      <img src="${site.url}/images/logo-cn.png" width="56" height="56" alt="Cnaz Foods logo" style="border-radius:12px;display:block;border:1px solid rgba(255,255,255,0.15);" />
                    </td>
                    <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;padding-left:16px;">
                      <div style="color:#FFFFFF;font-size:19px;font-weight:bold;">Cnaz Foods</div>
                      <div style="color:#AED876;font-size:12px;margin-top:3px;">Quick bite, endless delight.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#FFFFFF;padding:28px;font-family:Arial,Helvetica,sans-serif;">
                <h1 style="margin:0;font-size:20px;color:#16210F;">Welcome to Cnaz Foods 🎉</h1>
                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#3A4632;">
                  ${greeting}<br />
                  Your account is ready, which means your favourite Nigerian snacks are now only a few taps away.
                </p>
                <div style="margin-top:20px;background:#F6F3EA;border-radius:12px;padding:16px 18px;font-size:13px;line-height:1.7;color:#3A4632;">
                  <strong style="color:#16210F;">How ordering works</strong>
                  <ol style="margin:8px 0 0;padding-left:18px;">
                    <li>Add your favourite snacks to your cart.</li>
                    <li>Check out (no online payment needed).</li>
                    <li>We contact you to confirm delivery and payment.</li>
                  </ol>
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="background:#4A811C;border-radius:10px;">
                      <a href="${shopUrl}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Browse the shop</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#F0F1EC;border-radius:0 0 12px 12px;padding:18px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7464;">
                ${contactLines ? `${contactLines}<br />` : ""}
                You received this email because you created an account with Cnaz Foods.<br />
                Cnaz Foods. Quick bite, endless delight.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `CNAZ FOODS. Quick bite, endless delight.`,
    ``,
    `Welcome to Cnaz Foods`,
    ``,
    `${firstName ? `Hi ${firstName},` : "Hi there,"}`,
    `Your account is ready, which means your favourite Nigerian snacks are`,
    `now only a few taps away.`,
    ``,
    `How ordering works:`,
    `1. Add your favourite snacks to your cart.`,
    `2. Check out (no online payment needed).`,
    `3. We contact you to confirm delivery and payment.`,
    ``,
    `Browse the shop: ${shopUrl}`,
    contactLines ? `\n${contactLines}` : "",
    ``,
    `You received this email because you created an account with Cnaz Foods.`,
    `Cnaz Foods. Quick bite, endless delight.`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject, html, text };
}

/**
 * Sends the welcome email after a customer's first Google sign-in. Never
 * throws; the caller records the returned status on the profile row.
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailStatus> {
  const { subject, html, text } = buildWelcomeEmail(data);
  return sendViaConfiguredProvider({ to: data.email, subject, html, text });
}

// ---------------------------------------------------------------------------
//  Account emails — shared branded shell for the newer account emails
//  (deletion link, deletion receipt, sign-out notice). The order and welcome
//  builders above keep their own long-form copy.
// ---------------------------------------------------------------------------

function accountEmailShell(options: {
  heading: string;
  bodyHtml: string;
  footerReason: string;
}): string {
  const { heading, bodyHtml, footerReason } = options;

  const contactLines = [
    site.phone ? `Phone: ${site.phone}` : "",
    site.email ? `Email: ${site.email}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return `<!DOCTYPE html>
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
                    <td style="width:64px;vertical-align:middle;">
                      <img src="${site.url}/images/logo-cn.png" width="56" height="56" alt="Cnaz Foods logo" style="border-radius:12px;display:block;border:1px solid rgba(255,255,255,0.15);" />
                    </td>
                    <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;padding-left:16px;">
                      <div style="color:#FFFFFF;font-size:19px;font-weight:bold;">Cnaz Foods</div>
                      <div style="color:#AED876;font-size:12px;margin-top:3px;">Quick bite, endless delight.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#FFFFFF;padding:28px;font-family:Arial,Helvetica,sans-serif;">
                <h1 style="margin:0;font-size:20px;color:#16210F;">${heading}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#F0F1EC;border-radius:0 0 12px 12px;padding:18px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7464;">
                ${contactLines ? `${contactLines}<br />` : ""}
                ${footerReason}<br />
                Cnaz Foods. Quick bite, endless delight.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function firstNameGreeting(name?: string | null): { html: string; text: string } {
  const firstName = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return {
    html: firstName ? `Hi ${escapeHtml(firstName)},` : "Hi there,",
    text: firstName ? `Hi ${firstName},` : "Hi there,",
  };
}

// ---------------------------------------------------------------------------
//  Account deletion, step 1 — the confirmation-link email. Clicking
//  "Delete account" in the app sends THIS email; the account is only deleted
//  when the customer opens the link and confirms.
// ---------------------------------------------------------------------------

export type DeleteConfirmationEmailData = {
  name?: string | null;
  email: string;
  confirmUrl: string;
  expiresInMinutes: number;
};

/** Builds the "open this link to delete your account" email. */
export function buildDeleteConfirmationEmail(
  data: DeleteConfirmationEmailData,
): { subject: string; html: string; text: string } {
  const greeting = firstNameGreeting(data.name);

  const subject = `Confirm your account deletion · Cnaz Foods`;

  const bodyHtml = `
                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#3A4632;">
                  ${greeting.html}<br />
                  You asked us to delete the Cnaz Foods account for <strong style="color:#16210F;">${escapeHtml(data.email)}</strong>.
                </p>
                <div style="margin-top:20px;background:#FDF3D3;border-radius:12px;padding:16px 18px;font-size:13px;line-height:1.7;color:#3A4632;">
                  <strong style="color:#16210F;">What deleting means</strong>
                  <ul style="margin:8px 0 0;padding-left:18px;">
                    <li>Your profile, saved cart and sign-in are permanently removed.</li>
                    <li>Orders you already placed stay with Cnaz Foods, without your personal details.</li>
                    <li>This cannot be undone.</li>
                  </ul>
                </div>
                <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#3A4632;">
                  Your account is <strong style="color:#16210F;">not deleted yet</strong>. Open the button below and confirm to finish. This link expires in ${data.expiresInMinutes} minutes.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="background:#B3261E;border-radius:10px;">
                      <a href="${data.confirmUrl}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Delete my account</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6B7464;">
                  If you didn't request this, ignore this email. Your account stays exactly as it is, and the link stops working on its own.
                </p>`;

  const text = [
    `CNAZ FOODS. Quick bite, endless delight.`,
    ``,
    `Confirm your account deletion`,
    ``,
    greeting.text,
    `You asked us to delete the Cnaz Foods account for ${data.email}.`,
    ``,
    `What deleting means:`,
    `- Your profile, saved cart and sign-in are permanently removed.`,
    `- Orders you already placed stay with Cnaz Foods, without your personal details.`,
    `- This cannot be undone.`,
    ``,
    `Your account is NOT deleted yet. Open this link and confirm to finish:`,
    data.confirmUrl,
    ``,
    `This link expires in ${data.expiresInMinutes} minutes.`,
    ``,
    `If you didn't request this, ignore this email. Your account stays exactly`,
    `as it is, and the link stops working on its own.`,
  ].join("\n");

  const html = accountEmailShell({
    heading: `Confirm your account deletion`,
    bodyHtml,
    footerReason: `You received this email because a deletion was requested for this Cnaz Foods account.`,
  });

  return { subject, html, text };
}

/** Sends the delete-confirmation link email. Never throws. */
export async function sendDeleteConfirmationEmail(
  data: DeleteConfirmationEmailData,
): Promise<EmailStatus> {
  const { subject, html, text } = buildDeleteConfirmationEmail(data);
  return sendViaConfiguredProvider({ to: data.email, subject, html, text });
}

// ---------------------------------------------------------------------------
//  Account deletion, step 2 — the receipt, sent after the link was confirmed
//  and the account was deleted. The last email the address will receive.
// ---------------------------------------------------------------------------

export type AccountDeletedEmailData = {
  name?: string | null;
  email: string;
};

/** Builds the final "your account has been deleted" receipt email. */
export function buildAccountDeletedEmail(
  data: AccountDeletedEmailData,
): { subject: string; html: string; text: string } {
  const greeting = firstNameGreeting(data.name);
  const shopUrl = `${site.url}/shop`;

  const subject = `Your Cnaz Foods account has been deleted`;

  const bodyHtml = `
                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#3A4632;">
                  ${greeting.html}<br />
                  Your Cnaz Foods account has been deleted, as you confirmed. This is the last email this account will receive.
                </p>
                <div style="margin-top:20px;background:#F6F3EA;border-radius:12px;padding:16px 18px;font-size:13px;line-height:1.7;color:#3A4632;">
                  <strong style="color:#16210F;">What happened</strong>
                  <ul style="margin:8px 0 0;padding-left:18px;">
                    <li>Your profile, saved cart and sign-in were permanently removed.</li>
                    <li>Orders you placed stay with Cnaz Foods as business records, without your personal details.</li>
                  </ul>
                </div>
                <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#3A4632;">
                  If you ever fancy a snack again, you're always welcome to create a new account.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="background:#4A811C;border-radius:10px;">
                      <a href="${shopUrl}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Back to the shop</a>
                    </td>
                  </tr>
                </table>`;

  const text = [
    `CNAZ FOODS. Quick bite, endless delight.`,
    ``,
    `Your account has been deleted`,
    ``,
    greeting.text,
    `Your Cnaz Foods account has been deleted, as you confirmed. This is the`,
    `last email this account will receive.`,
    ``,
    `What happened:`,
    `- Your profile, saved cart and sign-in were permanently removed.`,
    `- Orders you placed stay with Cnaz Foods as business records, without your`,
    `  personal details.`,
    ``,
    `If you ever fancy a snack again, you're always welcome to create a new`,
    `account.`,
    ``,
    `Back to the shop: ${shopUrl}`,
  ].join("\n");

  const html = accountEmailShell({
    heading: `Your account has been deleted`,
    bodyHtml,
    footerReason: `You received this email because you deleted your Cnaz Foods account.`,
  });

  return { subject, html, text };
}

/** Sends the account-deleted receipt. Never throws. */
export async function sendAccountDeletedEmail(
  data: AccountDeletedEmailData,
): Promise<EmailStatus> {
  const { subject, html, text } = buildAccountDeletedEmail(data);
  return sendViaConfiguredProvider({ to: data.email, subject, html, text });
}

// ---------------------------------------------------------------------------
//  Sign-out notice — a short security-style email sent when the customer
//  signs out of their account.
// ---------------------------------------------------------------------------

export type SignedOutEmailData = {
  name?: string | null;
  email: string;
  signedOutAt: Date;
};

/** Builds the "you signed out" notice email. */
export function buildSignedOutEmail(
  data: SignedOutEmailData,
): { subject: string; html: string; text: string } {
  const greeting = firstNameGreeting(data.name);
  const signedOutAt = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(data.signedOutAt);
  const loginUrl = `${site.url}/login`;

  const subject = `You signed out · Cnaz Foods`;

  const bodyHtml = `
                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#3A4632;">
                  ${greeting.html}<br />
                  You signed out of your Cnaz Foods account on <strong style="color:#16210F;">${escapeHtml(signedOutAt)}</strong> (West Africa Time).
                </p>
                <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#3A4632;">
                  If this was you, no action is needed. Your cart and order history will be waiting the next time you sign in.
                </p>
                <div style="margin-top:20px;background:#FDF3D3;border-radius:12px;padding:16px 18px;font-size:13px;line-height:1.7;color:#3A4632;">
                  <strong style="color:#16210F;">If this wasn't you</strong><br />
                  Someone may have used your account. Please secure your Google account (change its password) and contact us straight away.
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="background:#4A811C;border-radius:10px;">
                      <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Sign back in</a>
                    </td>
                  </tr>
                </table>`;

  const text = [
    `CNAZ FOODS. Quick bite, endless delight.`,
    ``,
    `You signed out`,
    ``,
    greeting.text,
    `You signed out of your Cnaz Foods account on ${signedOutAt} (West`,
    `Africa Time).`,
    ``,
    `If this was you, no action is needed. Your cart and order history will be`,
    `waiting the next time you sign in.`,
    ``,
    `If this wasn't you:`,
    `Someone may have used your account. Please secure your Google account`,
    `(change its password) and contact us straight away.`,
    ``,
    `Sign back in: ${loginUrl}`,
  ].join("\n");

  const html = accountEmailShell({
    heading: `You signed out`,
    bodyHtml,
    footerReason: `You received this email because you signed out of your Cnaz Foods account.`,
  });

  return { subject, html, text };
}

/** Sends the sign-out notice. Never throws. */
export async function sendSignedOutEmail(data: SignedOutEmailData): Promise<EmailStatus> {
  const { subject, html, text } = buildSignedOutEmail(data);
  return sendViaConfiguredProvider({ to: data.email, subject, html, text });
}
