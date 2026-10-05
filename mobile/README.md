# Cnaz Foods — Mobile App

The official **Cnaz Foods** mobile app: a real React Native (Expo) application
that shops the same catalogue, uses the same accounts, the same carts and the
same checkout as the [Cnaz Foods website](../README.md) — one backend, zero
duplication.

**Stack:** React Native · Expo SDK 57 · expo-router · TypeScript ·
@supabase/supabase-js · expo-image · expo-web-browser · react-native-svg

---

## 1. Run it on your physical phone (5 minutes)

You need the website dev server running on your computer, and both devices on
the **same Wi-Fi**.

1. **Start the website** (from the repo root):

   ```bash
   npm run dev        # the app fetches products/orders from this server
   ```

2. **Point the app at your computer.** Find your computer's LAN IP:

   ```bash
   # Windows
   ipconfig          # look for "IPv4 Address" under your Wi-Fi adapter, e.g. 192.168.1.20
   # macOS
   ipconfig getifaddr en0
   ```

   Put it in `mobile/.env.local` (the file already exists with your values —
   just make sure the URL uses the LAN IP, **not** localhost):

   ```
   EXPO_PUBLIC_WEBSITE_URL=http://192.168.1.20:3000
   ```

3. **Start the app** (from the `mobile/` folder):

   ```bash
   npm install        # first time only
   npx expo start
   ```

4. **Install Expo Go** on your phone ([Android — Play
   Store](https://play.google.com/store/apps/details?id=host.exp.exponent) /
   [iOS — App Store](https://apps.apple.com/app/expo-go/id982107779)), then
   scan the QR code printed in the terminal:

   - **Android:** the "Scan QR code" button inside Expo Go.
   - **iOS:** the Camera app, then tap the banner.

   The app installs into Expo Go and launches on your phone.

> Troubleshooting: if the app opens but shows "Can't reach Cnaz Foods", the
> phone can't see your computer — check both are on the same Wi-Fi, your PC
> firewall allows Node.js on private networks, and `EXPO_PUBLIC_WEBSITE_URL`
> uses the LAN IP. Restart Expo with `npx expo start --clear` after changing
> `.env.local`.

## 2. Environment variables (`mobile/.env.local`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_WEBSITE_URL` | yes | The website the app talks to (catalogue + orders APIs, Supabase bootstrap). LAN IP for phone testing; your deployed URL for production. |
| `EXPO_PUBLIC_SUPABASE_URL` | fallback | Public Supabase project URL — normally resolved at runtime from `<website>/api/mobile/config`. Copied automatically by `npm run sync-env`. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | fallback | Public anon key (same one the website's browser holds). Row Level Security is the security boundary. |

No secret ever reaches the app: no service-role key, no Mailgun/Gmail/Paystack
credentials. Those stay server-side in the website.

Convenience scripts (run inside `mobile/`):

```bash
npm run sync-env          # copy the public Supabase values from ../.env.local
npm run generate-assets   # regenerate icons/splash from the real logo
npm run typecheck         # tsc --noEmit
node scripts/smoke-test.js  # end-to-end backend test (see §6)
```

## 3. Google sign-in configuration (nothing to do)

Email + password sign-in works with zero configuration (same Supabase
`auth.users` as the website). "Continue with Google" ALSO needs no Supabase
redirect-URL allow-listing: the app opens the website's own `/login` page in
the system auth browser, the customer completes the exact same Google flow as
on the website, and the site's `/auth/app-return` bridge hands the finished
session back to the app (deep link on a phone, redirect on the web preview).

That means the app always shares the website's Google provider, its consent
screen and its accounts one-for-one, with no per-platform dashboard steps.

If you ever switch to a dev build / production build, the only requirement is
that `EXPO_PUBLIC_WEBSITE_URL` points at a reachable website URL.

## 4. How it shares the website's backend (architecture)

```
┌─────────────────────┐        same Supabase project        ┌──────────────────┐
│  Website (Next.js)  │◀───────────────────────────────────▶│ Mobile (Expo RN) │
│                     │                                     │                  │
│ browser Supabase    │   products  ◀── GET /api/products   │ catalogue client │
│ client → RLS        │   orders    ◀── POST /api/orders    │ (Bearer auth)    │
│ writes carts        │               (Bearer auth added)   │ Supabase client  │
│                     │   auth      ◀── auth.users (shared) │ → AsyncStorage   │
│ cookie sessions     │   carts     ◀── carts + cart_items  │ writes carts     │
│                     │   orders    ◀── orders + items      │ (JWT + RLS)      │
└─────────────────────┘                                     └──────────────────┘
```

- **Catalogue:** `GET <website>/api/products` (public) — the app gets results
  from the SAME `getCatalog()` logic as the shop page: search, snack-type
  filter, price range, sorting. `?slug=` (added for the app) powers the
  product-details screen.
- **Bootstrap:** `GET <website>/api/mobile/config` (public, additive) — hands
  the app the website's public Supabase URL + anon key so there is exactly one
  configured backend.
- **Auth:** the same Supabase `auth.users`. Email/password accounts created in
  the app sign into the website (the website login page now has an email form)
  and vice versa. Google accounts work on both platforms.
- **Cart:** signed-in users read/write the SAME `carts` + `cart_items` rows
  through RLS, with the identical merge algorithm as the website
  (`src/context/cart-context.tsx` mirrors `src/context/cart-context.tsx` on
  the web). Guests keep their cart in AsyncStorage and it merges into the
  account cart on sign-in (quantities summed, capped at 99) — exactly like the
  website's localStorage guest cart.
- **Checkout:** `POST <website>/api/orders` with `Authorization: Bearer
  <access token>`. The server re-validates, re-prices from the database,
  saves the order + items, clears the saved cart and triggers the existing
  confirmation-email flow. Guest checkout works too (same as the website).
- **Orders/history:** read through Supabase with the user's own JWT; RLS keeps
  every customer's data private.

Website changes made for the mobile app (all additive/backwards-compatible):

| Change | Why | Compatibility |
| --- | --- | --- |
| `src/lib/supabase/bearer.ts` + `/api/orders` + `/api/account/signout-notice` | accept `Authorization: Bearer` from the app | cookie flow untouched |
| `?slug=` param on `/api/products` | product-details screen | extra optional param |
| `GET /api/mobile/config` | shares the PUBLIC Supabase URL/anon key with the app | new public route |
| CORS headers on the 4 mobile-consumed routes | lets the app run as Expo web too | native ignores CORS |
| Email/password form on the login page | mobile-created accounts can sign into the website | Google button unchanged |

## 5. Project structure

```
mobile/
├── app.json                    # identity, icons/splash (real logo), cnazfoods:// scheme
├── package.json                # expo ~57, expo-router, supabase-js
├── scripts/
│   ├── generate-assets.js      # builds icon/splash from the real website logo
│   ├── sync-env.js             # copies public Supabase values from ../.env.local
│   └── smoke-test.js           # end-to-end backend test
├── assets/                     # icon.png, splash-icon.png, real product photos
└── src/
    ├── app/                    # expo-router routes
    │   ├── _layout.tsx         # providers, fonts, boot (backend resolve)
    │   ├── index.tsx           # splash/gate → onboarding | sign-in | home
    │   ├── onboarding.tsx      # 3 slides, Skip + Get Started (saved flag)
    │   ├── sign-in.tsx         # email/password + Google
    │   ├── sign-up.tsx         # name/email/password/confirm + Google
    │   ├── product/[slug].tsx  # details, taste/ingredients, qty selector
    │   ├── checkout.tsx        # same fields/validation as the website
    │   ├── order/[id].tsx      # confirmation (reference, summary, email note)
    │   └── (tabs)/             # Home · Menu · Cart · Account (+ order history)
    ├── components/             # product cards, custom tab bar, Google logo…
    ├── context/                # auth-context, cart-context (shared-backend sync)
    └── lib/                    # env, supabase, api, catalog cache, theme, types
```

## 6. Testing

Automated backend test (needs the website dev server running):

```bash
cd mobile
node scripts/smoke-test.js
```

It creates a throwaway account (emails only ever go to the owner's
plus-addressed inbox), writes a cart as the website does, orders through the
API with Bearer auth, verifies the server cleared the cart, reads the order
back via RLS and proves another anonymous client cannot read it. Last run:
**all 15 checks passed** (order `CNZ-261004-7GSZ`, ₦4,600).

Manual checklist for the physical-phone test (Lesson 3 requirement):

1. Scan the QR in Expo Go → splash → onboarding (first run only) → sign-in.
2. Sign in with a website account → Home loads real products.
3. Home search "plantain" → 1 result. Menu search + Chips/Nuts chips + price
   filters + sorting.
4. Product details → quantity + Add to Cart → badge on the Cart tab.
5. Cart: change quantity, remove, empty state.
6. **Website → phone:** add an item to the cart on the website (same account),
   in the app pull down on the Cart screen (or sign out/in) → the item is
   there with the right quantity.
7. **Phone → website:** change the quantity in the app, reload the website's
   cart → same quantity.
8. Checkout → validation errors → place order → confirmation with reference →
   confirmation email arrives (existing website flow).
9. Account → profile, order history (the new order), sign out.
10. Sign up with a new email → confirmation email → confirm → sign in.

## 7. Known scope notes

- **Online payment (Paystack)** stays a website feature; the app confirms
  orders and the business arranges payment by phone (the website's default
  flow). Adding in-app Paystack via a browser hand-off is a future step.
- **Account deletion** (email-confirmed link) is website-only; the app shows
  sign-out only.
- The app requires the website to be reachable (it is the backend). If it
  isn't, a retry screen explains what to check.
