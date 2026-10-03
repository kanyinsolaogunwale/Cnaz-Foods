# AGENTS.md — Cnaz Foods

This file is the playbook for any AI agent (or human) working on this repository.
Read it before changing anything. It describes what this project is, the rules
that keep it correct, and the things that are intentionally out of scope.

---

## 1. Project purpose

A **real, functional online shop** for **Cnaz Foods**, built as the HNG 15
individual task. It is not a mockup: products, carts, orders and customer
accounts are persisted in Supabase; orders send branded confirmation emails
and new customers receive a one-time welcome email after their first Google
sign-in. The final product is deployed and publicly reviewable, and the code
is pushed to GitHub.

**The owner reviews the UI personally before deployment. Never deploy without
their explicit approval.**

## 2. Cnaz Foods business context

- **Business:** Cnaz Foods — packaged snacks (plantain chips, peanuts, groundnut).
- **Tagline:** “Quick bite, endless delight.”
- **Market:** Nigeria. Prices are in Naira (₦), formatted like ₦2,300.
- **Contact details:** the phone number and email were provided partially
  redacted. They must **only** come from environment variables
  (`NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_EMAIL`). Never invent
  digits, emails or addresses anywhere in the code or content.
- **Products (the only real ones — never invent more):**

| Product | Weight | Price | Taste | Ingredients |
| --- | --- | --- | --- | --- |
| Cnaz Foods Plantain Chips | 250g | ₦2,300 | Crunchy & lightly salted | _not provided — do not display_ |
| Cnaz Foods Peanuts | 750g | ₦4,000 | Fresh, crunchy & tasty | Groundnut, Salt |
| Cnaz Foods Groundnut | 500g | ₦2,700 | Fresh, crunchy & tasty | Groundnut, Salt |

- The business has ~8 product variations. More products are added **through the
  database only** (`products` table). The frontend must never hardcode product
  data, prices or counts.
- Copy on the site must stay within the facts above. No fake reviews,
  testimonials, statistics, health claims or invented ingredients/sizes.

## 3. Technology stack

- **Next.js 14 (App Router) + TypeScript** — pages, server components, API route.
- **Tailwind CSS** — the whole design system lives in `tailwind.config.ts` +
  `src/app/globals.css`.
- **Supabase** — Postgres database, Row Level Security, Google OAuth
  (`@supabase/ssr` for cookie sessions, `@supabase/supabase-js` for the
  service-role client).
- **Transactional email** — order confirmation, one-time welcome email,
  email-confirmed account deletion (link + receipt) and a sign-out notice.
  Provider priority in `sendViaConfiguredProvider()`: **Mailgun** (needs a
  domain — production) → **Gmail SMTP** (`nodemailer`, free, delivers to any
  recipient via a Gmail app password — the no-domain option) → **Resend**
  (plain fetch, test sender only reaches the Resend owner's inbox). All send
  the same branded template; no other SDK than `nodemailer` for SMTP.
- **Online payment** — Paystack (`src/lib/paystack.ts`, plain `fetch`, no SDK).
  The customer pays the **snack total** on Paystack's hosted page after the
  order is saved; **delivery is still confirmed by phone** (never charged
  online until the business sets delivery pricing). Disabled until
  `PAYSTACK_SECRET_KEY` is set; test mode uses `sk_test_…` keys.
- Nothing else. Do not add dependencies without a strong reason.

## 4. Project structure

```
├── AGENTS.md / README.md          # you are here
├── .env.example                   # template for all env vars (copy → .env.local)
├── next.config.mjs                # incl. remotePatterns for Google avatars
├── tailwind.config.ts             # design tokens (brand, ink, cream, accent, gold)
├── supabase/schema.sql            # full schema + RLS + seed — run in Supabase SQL editor
├── public/images/                 # logo-cn.png (real logo), products/*.png (real photos)
└── src/
    ├── middleware.ts              # session refresh + /account protection
    ├── app/
    │   ├── page.tsx               # home (hero, featured, about, contact sections)
    │   ├── shop/                  # catalogue
    │   ├── products/[slug]/       # product details
    │   ├── cart/                  # cart
    │   ├── checkout/              # checkout
    │   ├── orders/[id]/           # order confirmation / order detail (by order UUID)
    │   ├── login/                 # Google sign-in
    │   ├── account/               # account (protected)
    │   ├── account/orders/        # order history (protected)
    │   ├── auth/callback/route.ts # Google OAuth code exchange
    │   ├── api/orders/route.ts    # POST order creation (server-side)
    │   ├── api/account/delete/    # deletion: request link (POST) + confirm (POST)
    │   ├── api/account/signout-notice/route.ts # "you signed out" email
    │   ├── delete-account/        # emailed deletion-link confirm page
    │   └── layout.tsx, globals.css, error.tsx, not-found.tsx
    ├── components/                # header, footer, product card, forms, etc.
    ├── context/                   # auth-context, cart-context (client state)
    └── lib/
        ├── env.ts                 # NEXT_PUBLIC_* values (safe for browser)
        ├── env.server.ts          # service-role + Mailgun keys (SERVER ONLY)
        ├── delete-token.server.ts # signed deletion-link tokens (SERVER ONLY)
        ├── supabase/              # client.ts (browser), server.ts (cookies), admin.ts (service role)
        ├── data.ts                # public product queries
        ├── orders.ts              # order validation + creation (server)
        ├── mailgun.ts             # email builder + sender (server)
        ├── site.ts                # business name/tagline/env contact details
        └── format.ts              # ₦ formatting, dates, status labels
```

## 5. Design system

- **Primary brand colour:** the green from the Cnaz Foods logo. The Tailwind
  scale is `brand-50 … brand-900`; **`brand-600` (#4A811C) is the primary
  action colour** (buttons, Add to Cart, checkout CTA, active nav, links,
  focus rings). It is chosen dark enough for white text (WCAG AA ≥ 4.5:1).
- `brand-300/400` (bright lime) is used as an accent **on dark surfaces only**
  (hero, footer) — it mirrors the logo and never carries body text.
- **Supporting colours:** `accent` (red, from the packaging) is used only for
  errors/destructive signals; `gold` appears only in the email "info" box;
  `ink` (warm green-tinted neutrals) and `cream` are the neutrals. Nothing else.
- **Product imagery:** packaging photos are shot on black, so all product
  images sit on the `.stage` class (dark surface with a faint green glow).
  Keep that consistent — never put the black-background photos on white.
- **Typography:** Sora (display, `font-display`) + Inter (body, default).
  Headings are `tracking-tight`; body copy is 15–16px with relaxed leading.
- **Reusable classes** (in `globals.css`): `.container-page`, `.btn-primary`,
  `.btn-secondary`, `.btn-on-dark`, `.input`, `.input-invalid`, `.label`,
  `.card`, `.chip`, `.stage`.- Hierarchy rule: one primary action per view; secondary actions are **green-outlined buttons** (brand-600 border, brand-700 text) that **fill with the primary green and turn white on hover** — one consistent colour family across all buttons (owner's direction). On dark surfaces the outline uses the lime accent (`.btn-on-dark`) with the same fill-on-hover behaviour. `.btn-danger` stays red (destructive only). Do not add new bright colours.

## 6. UX rules

- Mobile is a first-class target: 2-up product grid ≥ 380px, ≥ 44px tap
  targets, sticky-free simple layouts, summary blocks below content.
- Show **only** information that exists (e.g. ingredients only when provided).
- Forms: labels on every field, inline errors tied with `aria-describedby`,
  `role="alert"` for submit errors, first invalid field focused on submit.
- The cart is honest: totals shown come from the client until the order is
  priced server-side; the confirmation page always shows the server values.
- Empty states exist for shop, cart, checkout, orders. No dead ends.
- Keyboard: visible green focus ring everywhere, skip-to-content link,
  semantic landmarks, `aria-current` on active nav.
- Destructive actions require a confirmation step: cart "Remove" opens the
  shared `ConfirmDialog` (focus-trapped, Escape/backdrop to cancel, red
  `btn-danger` confirm). Reuse that component for any future destructive
  action — never delete user data on a single click.

## 7. Coding conventions

- TypeScript strict. No `any` in new code unless interfacing with untyped
  Supabase rows (then cast to a locally declared row type).
- `"use client"` only where interactivity is required; fetch data in server
  components.
- Server-only modules (`env.server.ts`, `supabase/admin.ts`, `mailgun.ts`,
  `orders.ts`) must never be imported from client components.
- Log with the `[cnaz]` prefix; user-facing messages stay friendly and never
  leak internals.
- Formatting: 2-space indent, double quotes, semicolons.
- Currency is integer Naira end-to-end (no kobo) — `formatNaira` renders it.

## 8. Database structure

Everything lives in `supabase/schema.sql` (single source of truth):

- `products` — catalogue; add rows to add products. `is_active=false` hides a
  product everywhere. `sort_order` controls display order.
- `profiles` — one row per auth user (trigger `handle_new_user` on signup);
  `welcome_email_status` records the one-time welcome email (server-written).
- `carts` / `cart_items` — one cart per signed-in user, RLS-scoped to the owner.
- `orders` — reference (`CNZ-YYMMDD-XXXX`), customer + delivery snapshot,
  `subtotal_naira`, `delivery_fee_naira`, `total_naira`, `status`
  (`received → confirmed → delivered | cancelled`), `email_status`
  (`pending → sent | failed | skipped`), and payment fields
  (`payment_status` unpaid → pending → paid | failed, `payment_reference`,
  `paid_at`) — written only by the server after Paystack verify/webhook.
- `order_items` — snapshot of name/weight/unit price per line so history never
  changes when the catalogue changes.

**RLS:** products are publicly readable (active only); profiles/carts/cart
items are owner-only; orders/order items are read-only to their owner; there
is deliberately **no client-side insert policy on orders** — the server writes
them with the service role after re-validating and re-pricing.

## 9. Authentication rules

- Google-only sign-in via Supabase Auth (PKCE, cookie sessions).
- `src/middleware.ts` refreshes sessions and protects `/account/*`
  (redirects to `/login?next=…`).
- `/auth/callback` exchanges the code and only allows same-origin `next`
  paths. Cancelled consent → `/login?error=cancelled` with a friendly message.
- Guest carts live in localStorage; on sign-in the guest cart is **merged**
  into the Supabase cart (quantities summed, capped at 99) and local storage
  is cleared; on sign-out the in-memory cart is dropped.
- A one-time branded **welcome email** is sent after the customer's first
  Google sign-in (`/auth/callback` → `sendWelcomeEmail`).
  `profiles.welcome_email_status` is the lock: the server claims rows in
  `pending`/`failed` (→ `sending`), sends, then records the final status.
  Returning customers are never re-welcomed, concurrent sign-ins cannot
  double-send, failed sends retry on the next sign-in, and the whole step
  never blocks or breaks sign-in.
- A customer can never read another customer's orders — enforced by RLS, and
  account pages use the user's own JWT.
- **Account deletion (email-confirmed):** clicking “Delete account” never
  deletes anything directly. Confirming the dialog calls
  `POST /api/account/delete`, which emails a signed deletion link
  (`/delete-account?token=…`). The token is a 60-minute HMAC
  (`src/lib/delete-token.server.ts`, key derived from the service role key —
  no schema changes; in-memory 1-link-per-minute cooldown). The account is
  deleted ONLY when the customer opens the link and confirms: the
  `/delete-account` page POSTs the token to `/api/account/delete/confirm`
  (a POST, so email link scanners cannot trigger it), which deletes the auth
  user with the service role — profiles and carts cascade, **orders are
  kept** (`user_id` set to null by the FK) — then emails a final receipt.

## 10. Email rules (Resend default, Mailgun for production)

- Provider keys are server-side only (`MAILGUN_*` / `GMAIL_*` / `RESEND_*`
  env vars; `src/lib/env.server.ts`).
- Provider choice in `sendViaConfiguredProvider()`: **Mailgun if configured,
  else Gmail SMTP, else Resend.** Gmail SMTP is the free path to reach any
  customer inbox without a domain (Gmail app password, `nodemailer`); Mailgun
  activates as soon as the business has a sending domain — no code changes,
  just env vars.
- The email is sent **after** the order + items are saved. If the provider
  fails, `orders.email_status` becomes `failed` and the confirmation page
  tells the customer to keep their order number. **The order is never
  re-created.**
- If no provider is configured the email is skipped and marked `skipped`
  (visible on the confirmation page).
- A **welcome email** is sent once per customer after their first Google
  sign-in (`sendWelcomeEmail`, same provider order, same template style,
  status recorded on the profile row — see §9).
- **Deletion emails:** confirming “Delete account” sends a
  delete-confirmation LINK email (see §9); after the link is confirmed, a
  final receipt is sent. Same provider order, same template style.
- **Sign-out notice:** `POST /api/account/signout-notice` (called by the
  sign-out dialog before the session clears) emails a short “you signed
  out” note. Failures never block sign-out.
- **Strict sending policy (owner mandate):** emails go out ONLY for genuine
  business events: a first sign-in, a real order, a deletion-link request, a
  completed deletion, and sign-out. NEVER send test/status emails to any
  customer or partner address. Manual tests go only to the owner's own
  inbox (use Gmail plus-addressing like `ogunwalekanyinsola+test@gmail.com`).
  A phantom email to a real customer is a serious incident — it happened
  once with a fake order confirmation. Never again.
- The shared branded templates live in `src/lib/mailgun.ts`
  (`buildOrderConfirmationEmail`, `buildWelcomeEmail`,
  `buildDeleteConfirmationEmail`, `buildAccountDeletedEmail`,
  `buildSignedOutEmail`) — all providers send the same HTML/text.

## 11. Delivery fee & payment rules (important)

The business has not provided delivery pricing, so `deliveryFee = 0` in
`createOrder()` (`src/lib/orders.ts`) and the UI/email say **“To be
confirmed”** with a note that we contact the customer after checkout. When the
business confirms pricing, change it in exactly one place (that constant) and
update the copy — do not invent per-city logic.

**Payment flow (Paystack):** order is saved first → the confirmation page
offers “Pay ₦… online” → `POST /api/orders/[id]/pay` initializes a Paystack
transaction (amount = the order's server-side total in kobo, unique reference
per attempt) → Paystack hosted page → customer returns to
`/api/payments/callback`, which **verifies via Paystack's API** (the browser
is never trusted, amounts must match the order total exactly) →
`/api/payments/webhook` (HMAC SHA-512 signature check + re-verify) covers
missed redirects. Every step is idempotent; failed/pending states keep the
order intact and explain themselves on the confirmation page. Payment is
**optional** — cash-on-arrangement by phone remains valid.

## 12. Security requirements

- Never expose the Supabase service role key or Mailgun API key to the client.
  They exist only in `env.server.ts` / `supabase/admin.ts`, read from env vars.
- `.env*` files are git-ignored — never commit secrets or paste them into code.
- Never trust client prices/quantities: `createOrder` re-reads products from
  the DB and computes totals server-side.
- Keep RLS enabled on every table; new tables must ship with policies.

## 13. Environment variables

See `.env.example`. Required:

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase data + Google auth |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side order writes + order lookup (server only) |
| `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` / `MAILGUN_FROM` | emails — takes priority when configured (production) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `GMAIL_FROM` | emails via Gmail SMTP — free, any recipient, no domain (used before Resend) |
| `RESEND_API_KEY` / `RESEND_FROM` | email fallback — test sender reaches only the Resend owner's inbox |
| `PAYSTACK_SECRET_KEY` | online payment (Paystack). `sk_test_…` now, `sk_live_…` later; payment UI hides when empty |
| `NEXT_PUBLIC_SITE_URL` | auth redirects + links inside emails |
| `NEXT_PUBLIC_CONTACT_PHONE` / `NEXT_PUBLIC_CONTACT_EMAIL` | real business contact details (optional; hidden when empty) |

## 14. Testing requirements (before claiming anything works)

1. `npm run build` passes (typecheck included).
2. Flows: home → shop → product → add to cart → quantity ± → remove → empty
   cart → checkout validation errors → successful order → confirmation page.
3. Cart persistence: guest cart survives reload; signed-in cart round-trips
   through Supabase; guest cart merges on sign-in.
4. Orders: row in `orders` + correct `order_items` and totals in Supabase;
   signed-in order appears in `/account/orders` and is **not** visible to a
   second Google account (RLS check).
5. Email: order confirmation (subject, order number, items, quantities,
   prices, total, delivery details) and the one-time welcome email on first
   sign-in — verify it does **not** repeat on the next sign-in.
6. Deletion flow: “Delete account” emails a link (no deletion yet) →
   opening the link shows the confirm page → confirming deletes the account
   and sends a receipt; ignoring the link leaves the account active;
   expired/used/invalid links show a friendly error. Signing out sends the
   signed-out notice. Test ONLY to the owner's own inbox (§10).
7. Payment (with test keys): pay flow ends on Paystack's hosted page, a test
   card marks the order `paid` with `paid_at` set; a declined card shows the
   honest failure state; the webhook endpoint rejects bad signatures.
8. Auth: sign-in, reload (session persists), sign-out, cancelled sign-in,
   protected-route redirect.
9. Layout at 390px and 1440px; browser console free of errors.
10. Confirm no secrets appear in the client bundle.

## 15. Deployment

- Target: **Vercel** (Next.js). Add all env vars in the project settings.
- Supabase Auth URL configuration: set Site URL to the production URL and add
  `https://<project>.vercel.app/**` (plus localhost for dev) to Redirect URLs.
- **Do not deploy until the owner has reviewed the app and explicitly
  approved deployment.**

## 16. Intentionally out of scope

Do not add these without the owner asking: admin dashboard (products are managed in the
Supabase dashboard), product search/filters (3 products), reviews/ratings,
wishlists, newsletters, separate About/Contact pages (homepage sections cover
them), email/password auth (Google only), discount codes, order editing UI,
invented products/claims/contacts.

## 17. Instructions for future AI agents

- Read this file and `README.md` first; inspect existing code before editing.
- Make focused changes; don't redesign working pages or restyle the design
  system without a reason.
- Keep business facts exactly as given in §2; when info is missing, leave a
  clearly-marked gap instead of inventing content.
- Verify with `npm run build` and manual flow testing before saying "done".
- Never commit secrets, never push or deploy without explicit approval.
