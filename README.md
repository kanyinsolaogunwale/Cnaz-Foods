# Cnaz Foods — Online Shop

**Cnaz Foods** sells packaged snacks — crunchy plantain chips, peanuts and
groundnut. _“Quick bite, endless delight.”_

This repository contains the complete shop web application built for the HNG 15
individual task: a product catalogue, cart, checkout, order persistence in
Supabase, Google sign-in, and Mailgun order-confirmation emails.

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
- **Order confirmation email** — sent after the order is saved via **Mailgun**
  (primary) with **Resend** as a no-custom-domain fallback; failures are
  recorded on the order and surfaced on the confirmation page.

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
| `MAILGUN_API_KEY` | Mailgun → Settings → API keys (primary provider) |
| `MAILGUN_DOMAIN` | e.g. `mg.yourdomain.com` (needs a verified sending domain) |
| `MAILGUN_FROM` | optional; defaults to `Cnaz Foods <postmaster@YOUR_DOMAIN>` |
| `RESEND_API_KEY` | optional fallback: resend.com → API keys |
| `RESEND_FROM` | optional fallback: an email you verified on Resend |
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
`src/lib/mailgun.ts`) after the order is saved. Mailgun is used when
configured; otherwise Resend is used if available. If sending fails, the
order is kept, `email_status` is set to `failed`, and the confirmation page
asks the customer to keep their order number.

> **No custom domain yet?** Set only the `RESEND_*` variables — Resend can
> send to your own verified email address on its free tier, so order emails
> work end-to-end today. Add Mailgun later when the business has a domain.

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
