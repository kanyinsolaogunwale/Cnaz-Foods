# AGENTS.md — Cnaz Foods

This file is the playbook for any AI agent (or human) working on this repository.
Read it before changing anything. It describes what this project is, the rules
that keep it correct, and the things that are intentionally out of scope.

---

## 1. Project purpose

A **real, functional online shop** for **Cnaz Foods**, built as the HNG 15
individual task. It is not a mockup: products, carts, orders and customer
accounts are persisted in Supabase, orders send Mailgun confirmation emails,
and customers sign in with Google. The final product is deployed and publicly
reviewable, and the code is pushed to GitHub.

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
- **Mailgun** — order confirmation emails, called directly over the REST API
  with `fetch` (no SDK, no extra dependency). **Resend** is supported as a
  fallback provider (also plain `fetch`) for environments without a Mailgun
  sending domain; Mailgun takes priority when both are configured.
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
    │   └── layout.tsx, globals.css, error.tsx, not-found.tsx
    ├── components/                # header, footer, product card, forms, etc.
    ├── context/                   # auth-context, cart-context (client state)
    └── lib/
        ├── env.ts                 # NEXT_PUBLIC_* values (safe for browser)
        ├── env.server.ts          # service-role + Mailgun keys (SERVER ONLY)
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
  `.card`, `.chip`, `.stage`.
- Hierarchy rule: one primary action per view; secondary actions are white
  bordered buttons or green text links. Do not add new bright colours.

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
- `profiles` — one row per auth user (trigger `handle_new_user` on signup).
- `carts` / `cart_items` — one cart per signed-in user, RLS-scoped to the owner.
- `orders` — reference (`CNZ-YYMMDD-XXXX`), customer + delivery snapshot,
  `subtotal_naira`, `delivery_fee_naira`, `total_naira`, `status`
  (`received → confirmed → delivered | cancelled`), `email_status`
  (`pending → sent | failed | skipped`).
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
- A customer can never read another customer's orders — enforced by RLS, and
  account pages use the user's own JWT.

## 10. Email rules (Mailgun primary, Resend fallback)

- Provider keys are server-side only (`MAILGUN_*` / `RESEND_*` env vars;
  `src/lib/env.server.ts`).
- Mailgun satisfies the HNG requirement and is used whenever it is
  configured. Resend is only used when Mailgun is absent — it exists because
  Mailgun needs a custom sending domain, which the business does not have yet.
- The email is sent **after** the order + items are saved. If the provider
  fails, `orders.email_status` becomes `failed` and the confirmation page
  tells the customer to keep their order number. **The order is never
  re-created.**
- If no provider is configured the email is skipped and marked `skipped`
  (visible on the confirmation page).
- The shared branded template lives in `src/lib/mailgun.ts`
  (`buildOrderConfirmationEmail`) — both providers send the same HTML/text.

## 11. Delivery fee (important)

The business has not provided delivery pricing, so `deliveryFee = 0` in
`createOrder()` (`src/lib/orders.ts`) and the UI/email say **“To be
confirmed”** with a note that we contact the customer after checkout. When the
business confirms pricing, change it in exactly one place (that constant) and
update the copy — do not invent per-city logic.

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
| `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` / `MAILGUN_FROM` | confirmation emails (primary provider) |
| `RESEND_API_KEY` / `RESEND_FROM` | fallback email provider (used only if Mailgun is unset) |
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
5. Email: send to a Mailgun sandbox authorized recipient; verify subject,
   order number, items, quantities, prices, total and delivery details.
6. Auth: sign-in, reload (session persists), sign-out, cancelled sign-in,
   protected-route redirect.
7. Layout at 390px and 1440px; browser console free of errors.
8. Confirm no secrets appear in the client bundle.

## 15. Deployment

- Target: **Vercel** (Next.js). Add all env vars in the project settings.
- Supabase Auth URL configuration: set Site URL to the production URL and add
  `https://<project>.vercel.app/**` (plus localhost for dev) to Redirect URLs.
- **Do not deploy until the owner has reviewed the app and explicitly
  approved deployment.**

## 16. Intentionally out of scope

Do not add these without the owner asking: online payment gateway (orders are
confirmed by phone contact), admin dashboard (products are managed in the
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
