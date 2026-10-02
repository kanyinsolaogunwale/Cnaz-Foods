# Cnaz Foods — Online Shop

**Cnaz Foods** sells packaged snacks — crunchy plantain chips, peanuts and
groundnut. _“Quick bite, endless delight.”_

This repository contains the complete shop web application built for the HNG 15
individual task: a product catalogue, cart, checkout, order persistence in
Supabase, Google sign-in, and branded transactional emails (order confirmation
+ a one-time welcome email) via Resend by default with Mailgun support.

## Features

- **Home, Shop, Product details** — product data is served from the Supabase
  `products` table (never hardcoded), so new products appear automatically.
- **Cart** — works for guests (localStorage) and persists to Supabase for
  signed-in customers; guest carts are merged into the account on sign-in.
- **Checkout** — validated delivery details, server-side re-pricing of every
  line, and order creation with a unique reference (`CNZ-YYMMDD-XXXX`).
- **Order confirmation** — saved order + items, order number, delivery
  details and "what happens next".
- **Google sign-in** — Supabase Auth (Google Cloud OAuth), persistent cookie
  sessions, protected account pages.
- **Account & order history** — customers see only their own orders
  (enforced by Row Level Security).
- **Order confirmation email** — sent after the order is saved. Uses **Resend**
  (free, no custom domain needed) out of the box, and **Mailgun** the moment
  its keys are configured (e.g. in production); failures are recorded on the
  order and surfaced on the confirmation page.
- **Online payment (Paystack)** — after checkout, the customer can pay the
  snack total on Paystack's hosted page (card, bank transfer, USSD). The
  server verifies every charge with Paystack's API before marking an order
  paid; a webhook backs it up. Test mode works with `sk_test_…` keys and no
  business registration; without keys the shop simply confirms payment by
  phone as before.
- **Welcome email** — a one-time branded email after a customer's first
  Google sign-in. Never sent twice; retried automatically if the provider
  fails.

## Technology stack

- [Next.js 14](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres, Row Level Security, Google OAuth
- [Mailgun](https://www.mailgun.com) — transactional email (REST API)

## Run it locally

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (see below), then:
cp .env.example .env.local   # fill in real values

# 3. Create the database
#    Supabase Dashboard → SQL Editor → paste supabase/schema.sql → Run.

# 4. Start the dev server
npm run dev                  # http://localhost:3000
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (**server only**) |
| `RESEND_API_KEY` | resend.com → API keys (**default email provider — set this**) |
| `RESEND_FROM` | for testing: `Cnaz Foods <onboarding@resend.dev>` (delivers only to your own inbox); with a domain: e.g. `Cnaz Foods <orders@cnazfoods.com>` |
| `MAILGUN_API_KEY` | optional: activates Mailgun when the business has a domain |
| `MAILGUN_DOMAIN` | optional: e.g. `mg.cnazfoods.com` |
| `MAILGUN_FROM` | optional; defaults to `Cnaz Foods <postmaster@YOUR_DOMAIN>` |
| `PAYSTACK_SECRET_KEY` | paystack.com → Settings → API Keys & Webhooks (`sk_test_…` for testing) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; production URL in deploy |
| `NEXT_PUBLIC_CONTACT_PHONE` | real business phone (shown on the site when set) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | real business email (shown on the site when set) |

Never commit `.env.local` — it is git-ignored.

## Supabase configuration

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → Run.
   This creates the tables (`products`, `profiles`, `carts`, `cart_items`,
   `orders`, `order_items`), Row Level Security policies, the signup trigger
   and the three Cnaz Foods products.
3. Copy the URL, anon key and service role key into `.env.local`.
4. Adding products later: insert rows into `products` (Dashboard → Table
   editor or SQL). Set `image_url` to a file under `public/images/products/`
   or a full URL, and toggle `is_active` / `is_featured` as needed.

## Google authentication configuration

1. [Google Cloud Console](https://console.cloud.google.com) → create/select a
   project (e.g. "Cnaz Foods").
2. **OAuth consent screen**: External, app name "Cnaz Foods", your support
   email; add the scopes `email`, `profile`, `openid`; add test users if you
   keep it in Testing mode.
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` and your
     production URL.
   - Authorized redirect URIs:
     `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret** into Supabase Dashboard →
   Authentication → Providers → Google → enable → paste → Save.
5. Supabase → Authentication → URL Configuration:
   - Site URL: your production URL (locally `http://localhost:3000`).
   - Redirect URLs: `http://localhost:3000/**` and your production URL.

## Mailgun configuration

1. Create a [Mailgun](https://signup.mailgun.com) account and add a sending
   domain (or use the sandbox domain for testing).
2. For a custom domain, add the DNS records Mailgun shows (SPF, DKIM, DMARC).
3. Sandbox domains can only send to **Authorized Recipients** — add your test
   email there.
4. Copy the private API key and domain into `.env.local`
   (`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`).

The confirmation email is sent from the server (`/api/orders` →
`src/lib/mailgun.ts`) after the order is saved. A one-time **welcome email**
is sent from `/auth/callback` after the customer's first Google sign-in —
same provider order (Mailgun first, then Resend), same template style, with
the outcome recorded in `profiles.welcome_email_status` so it never sends
twice and retries after a failure. **Resend is the default provider** (free
tier, no custom domain needed — perfect for the review build). When the business later adds a sending domain, filling in the
`MAILGUN_*` variables automatically switches the app to Mailgun with no code
changes — satisfying the Mailgun deployment requirement. If sending fails,
the order is kept, `email_status` is set to `failed`, and the confirmation
page asks the customer to keep their order number.

## Paystack configuration

1. Create a [Paystack](https://paystack.com) account (test mode needs no
   business registration).
2. **Settings → API Keys & Webhooks** → copy the **Secret key** (`sk_test_…`)
   into `.env.local` as `PAYSTACK_SECRET_KEY`.
3. Same page → **Webhook URL**: `https://<your-domain>/api/payments/webhook`
   (for local testing, the callback redirect already covers verification; the
   webhook is a production safety net).
4. Pay with Paystack's test cards (e.g. `4084 0840 8408 4081`, any future
   expiry, any CVV, any OTP) to see the full flow.
5. Going live later: complete your business details in Paystack, swap in the
   `sk_live_…` key — no code changes.

## Deployment

The app is designed for [Vercel](https://vercel.com):

1. Push this repository to GitHub.
2. Import it into Vercel (framework auto-detected).
3. Add **all** environment variables from the table above (use the production
   `NEXT_PUBLIC_SITE_URL`).
4. Update the Google OAuth redirect URIs and Supabase redirect URLs to include
   the production domain.
5. Deploy.

## Security notes

- The Supabase service role key and Mailgun API key are used **server-side
  only** (`src/lib/env.server.ts`, `src/lib/supabase/admin.ts`) and are never
  sent to the browser.
- Orders are created by the server, which re-validates all input and re-prices
  every line from the database — client values are never trusted.
- Row Level Security keeps every customer's orders private to them.
