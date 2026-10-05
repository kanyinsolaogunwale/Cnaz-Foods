# Cnaz Foods — Online Shop + Mobile App

**Cnaz Foods** sells packaged snacks — crunchy plantain chips, peanuts and
groundnut. _“Quick bite, endless delight.”_

This repository contains the complete shop built for the HNG 15 individual
task: the **website** (this Next.js app) and the **mobile app** (React Native
+ Expo, in [`mobile/`](mobile/README.md)) sharing ONE backend — the same
Supabase project, the same `auth.users` accounts, the same carts and the same
order/checkout pipeline.

The website: a product catalogue, cart, checkout, order persistence in
Supabase, Google + email/password sign-in, and branded transactional emails
(order confirmation, one-time welcome, email-confirmed account deletion and a
sign-out notice) sent through Gmail SMTP, with Resend as fallback. The mobile
app: splash, onboarding, sign-in/sign-up (email/password + Google), Home ·
Menu · Cart · Account navigation, search and filters over the live catalogue,
shared cart synchronisation, checkout through the same `/api/orders`
endpoint, order confirmation and order history. Setup and the physical-phone
test guide live in [`mobile/README.md`](mobile/README.md).

## Features

- **Home, Shop, Product details** — product data is served from the Supabase
  `products` table (never hardcoded), so new products appear automatically.
- **Search, filters & sorting** — the shop page queries real database data:
  free-text search, snack-type filter (derived from actual product names, so
  only types that exist are offered), price range, and low-to-high /
  high-to-low price sorting. Filters live in the URL, so filtered views can
  be shared. On phones and tablets the filters open in a bottom sheet; on
  desktop they open in a dropdown panel beside the search field.
- **Public catalogue API** — `GET /api/products` exposes the same catalogue
  (same params: `q`, `sort`, `type`, `min`, `max`, plus `slug` for the mobile
  product-details screen; returns `{ products, count, types }`) so the mobile
  app reuses the website's backend without duplicating logic.
- **Mobile app** — lives in `mobile/` (own package.json; the website is
  untouched apart from additive API changes listed in the mobile README).
  Auth, catalogue, cart and orders are the website's own backend: the app
  calls `GET /api/products`, `GET /api/mobile/config` and `POST /api/orders`
  (with Bearer auth), and reads/writes the same `carts`/`cart_items`/
  `orders` tables through Supabase RLS.
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
- **Order confirmation email** — sent after the order is saved through
  **Gmail SMTP** (free, delivers to any inbox); failures are recorded on the
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
- **Email-confirmed account deletion** — clicking “Delete account” emails a
  secure deletion link (valid 60 minutes). The account is deleted only when
  the link is opened and confirmed, then a receipt email wraps up.
- **Sign-out notice** — a short email whenever a customer signs out.

## Technology stack

- [Next.js 14](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres, Row Level Security, Google OAuth
- Transactional email — Gmail SMTP (free, delivers to any inbox), with
  Resend as fallback

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

### Run the mobile app

The mobile app has its own dependencies and env file — see
[`mobile/README.md`](mobile/README.md) for the full guide. In short:

```bash
cd mobile
npm install
npx expo start               # scan the QR with Expo Go on your phone
```

Point `mobile/.env.local` → `EXPO_PUBLIC_WEBSITE_URL` at this server (your
computer's LAN IP for a physical phone) so the app talks to the same backend.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (**server only**) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `GMAIL_FROM` | Gmail SMTP sending (**the active provider**): a Gmail app password from myaccount.google.com → Security |
| `RESEND_API_KEY` / `RESEND_FROM` | resend.com → API keys (fallback provider; used only when Gmail SMTP is not configured) |
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
   - Redirect URLs: `http://localhost:3000/**`, your production URL, and —
     for the mobile app — `cnazfoods://**`, `exp://**` and
     `http://localhost:8081/**` (see [`mobile/README.md`](mobile/README.md)).

The confirmation email is sent from the server (`/api/orders` →
`src/lib/mailgun.ts`) after the order is saved. A one-time **welcome email**
is sent from `/auth/callback` after the customer's first Google sign-in, and
account emails (deletion link, deletion receipt, sign-out notice) are sent
from their API routes — all through the same provider priority:
**Gmail SMTP first (the configured sender today), then Resend**. Gmail SMTP
uses a Gmail app password: free, delivers to any inbox, no domain needed. If
sending fails, the order is kept, `email_status` is set to `failed`, and the
confirmation page asks the customer to keep their order number. **Only
genuine business emails are ever sent** (first sign-in, real orders, account
deletion, sign-out); tests go to the owner's inbox only.

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

- The Supabase service role key and email provider keys are used **server-side
  only** (`src/lib/env.server.ts`, `src/lib/supabase/admin.ts`) and are never
  sent to the browser.
- Orders are created by the server, which re-validates all input and re-prices
  every line from the database — client values are never trusted.
- Row Level Security keeps every customer's orders private to them.
- Account deletion is confirmed by email: a signed, expiring link (HMAC of
  the user id + expiry, key derived server-side from the service role key)
  must be opened and confirmed before the account is deleted. The link is
  verified on a POST, so email link scanners cannot trigger a deletion.
