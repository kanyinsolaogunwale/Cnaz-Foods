/**
 * Cnaz Foods mobile-app backend smoke test.
 *
 * Exercises the REAL shared backend the same way the app does:
 *   1. Sign up / sign in a test account (Supabase auth — the website's system)
 *   2. Write a cart (carts + cart_items) as that user  [= website-side cart]
 *   3. Search the catalogue through GET /api/products?q=
 *   4. Place an order through POST /api/orders with a Bearer token  [= app flow]
 *   5. Verify the server cleared the saved cart after the order
 *   6. Read the order back through Supabase with RLS
 *   7. Verify RLS isolation: another anonymous client cannot see the cart
 *
 * Prereqs: the website dev server is running and .env.local is configured.
 * Emails go only to the owner's plus-addressed inbox (AGENTS.md §10).
 *
 * Run: node scripts/smoke-test.js  (from the mobile/ directory)
 */
const fs = require("fs");
const path = require("path");

const WEBSITE = process.env.WEBSITE_URL ?? "http://localhost:3000";

// Read the public Supabase details from the website's .env.local (they are
// public by design; this script never touches or prints any secret).
const envFile = fs.readFileSync(path.resolve(__dirname, "..", "..", ".env.local"), "utf8");
function env(name) {
  const match = new RegExp(`^${name}=(.*)$`, "m").exec(envFile);
  return match ? match[1].trim() : "";
}
const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
// Server-only, used here ONLY to confirm the throwaway test address (the
// project has "Confirm email" enabled). Never printed, never committed.
const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase keys in the website .env.local");
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");

// Supabase rate-limits sign-ups per hour, so the test account is created
// once and its credentials cached locally (git-ignored — test values only).
const CREDS_FILE = path.resolve(__dirname, "..", ".smoke-test-account.json");

function loadCreds() {
  try {
    return JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveCreds(creds) {
  try {
    fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2));
  } catch {
    // ignore
  }
}

function newCreds() {
  const runTag = `${Date.now().toString(36)}`;
  return {
    email: `ogunwalekanyinsola+cnazapp${runTag}@gmail.com`,
    password: `CnazTest!${runTag}x`,
  };
}

let failures = 0;
function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Auth — reuse the cached test account when it exists ------------------
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let creds = loadCreds();
  let session = null;
  if (creds) {
    const { data, error } = await supabase.auth.signInWithPassword(creds);
    if (!error) {
      session = data.session;
      check("sign in with cached test account", true, creds.email);
    }
  }

  if (!session) {
    creds = newCreds();

    // Try the normal sign-up first (exactly what the app does). If Supabase's
    // per-hour email rate limit is hit, create the test user via the admin
    // API instead — no email is sent, so no rate limit applies.
    let signUpError = null;
    let session0 = null;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: creds.email,
        password: creds.password,
        options: { data: { full_name: "Cnaz App Test" } },
      });
      signUpError = error;
      if (!error) {
        check("sign up (shared Supabase auth)", true, creds.email);
        session0 = data.session;
        if (!session0 && data.user) {
          // "Confirm email" is ON: confirm the throwaway address via the
          // admin API, then sign in like the app would.
          const { error: confirmError } = await admin.auth.admin.updateUserById(data.user.id, {
            email_confirm: true,
          });
          check("confirm test email (admin API)", !confirmError, confirmError?.message);
        }
      }
    } catch (error) {
      signUpError = error;
    }

    if (signUpError) {
      console.log(`NOTE  sign-up unavailable (${signUpError.message}); creating the test user via the admin API`);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: creds.email,
        password: creds.password,
        email_confirm: true,
        user_metadata: { full_name: "Cnaz App Test" },
      });
      check("create test user (admin API)", !createError, createError?.message ?? creds.email);
      if (createError) process.exit(1);
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(creds);
    check("sign in (password, shared auth)", !signInError && Boolean(signInData.session), signInError?.message);
    session = signInData.session;
    if (!session) process.exit(1);
    saveCreds(creds);
  }
  const token = session.access_token;

  // 2. Website-side cart write (same tables the website's cart uses) --------
  let { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!cart) {
    const { data: created, error: cartError } = await supabase
      .from("carts")
      .insert({ user_id: session.user.id })
      .select("id")
      .single();
    check("create cart row", !cartError, cartError?.message);
    cart = created;
  } else {
    check("reuse existing cart row", true, cart.id);
  }

  // Catalogue for real product ids.
  const catalogResponse = await fetch(`${WEBSITE}/api/products`);
  const catalog = await catalogResponse.json();
  check("catalogue API returns products", catalogResponse.ok && catalog.products?.length > 0, `${catalog.count ?? "?"} products`);

  const plantain = catalog.products.find((p) => p.slug === "plantain-chips-250g");
  check("plantain chips present", Boolean(plantain));

  const { error: itemsError } = await supabase
    .from("cart_items")
    .upsert(
      { cart_id: cart.id, product_id: plantain.id, quantity: 2 },
      { onConflict: "cart_id,product_id" },
    );
  check("add cart item (Plantain Chips x2)", !itemsError, itemsError?.message);

  // 3. Catalogue search ------------------------------------------------------
  const searchResponse = await fetch(`${WEBSITE}/api/products?q=plantain`);
  const search = await searchResponse.json();
  check(
    "catalogue search q=plantain",
    searchResponse.ok && search.products.some((p) => p.slug === "plantain-chips-250g"),
    `${search.count} hit(s)`,
  );

  // 4. Order through the website API with Bearer auth (the app's flow) -------
  const orderResponse = await fetch(`${WEBSITE}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [{ productId: plantain.id, quantity: 2 }],
      customer: {
        fullName: "Cnaz App Test",
        email: creds.email,
        phone: "08030000000",
        address: "1 Test Lane, Smoke Test Area",
        city: "Uyo",
        state: "Akwa Ibom",
        note: "Mobile smoke test order",
      },
    }),
  });
  const orderBody = await orderResponse.json();
  check(
    "order via POST /api/orders (Bearer)",
    orderResponse.status === 201 && Boolean(orderBody.order?.reference),
    orderResponse.status === 201 ? orderBody.order.reference : orderBody.error ?? `status ${orderResponse.status}`,
  );

  // 5. The server clears the saved cart after an order -----------------------
  const { data: remainingItems } = await supabase.from("cart_items").select("id").eq("cart_id", cart.id);
  check("cart cleared after order", (remainingItems ?? []).length === 0, `${remainingItems?.length ?? 0} left`);

  // 6. Read the order back with RLS -----------------------------------------
  const { data: savedOrder } = await supabase
    .from("orders")
    .select("reference, total_naira, status, order_items ( product_name, quantity )")
    .eq("id", orderBody.order.id)
    .single();
  check(
    "order readable via Supabase (RLS)",
    Boolean(savedOrder) && savedOrder.reference === orderBody.order.reference,
    savedOrder ? `${savedOrder.reference} · ₦${savedOrder.total_naira}` : "not visible",
  );
  check(
    "order items snapshot",
    (savedOrder?.order_items ?? []).some((i) => i.product_name.includes("Plantain Chips") && i.quantity === 2),
  );

  // 7. RLS isolation: a fresh anonymous client must see nothing -------------
  const intruder = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: intruderCart } = await intruder
    .from("cart_items")
    .select("id")
    .eq("cart_id", cart.id);
  check("RLS: anonymous client cannot read the cart", (intruderCart ?? []).length === 0);
  const { data: intruderOrders } = await intruder.from("orders").select("id").eq("id", orderBody.order.id);
  check("RLS: anonymous client cannot read the order", (intruderOrders ?? []).length === 0);

  // 8. Catalogue slug lookup (mobile product details screen) ----------------
  const slugResponse = await fetch(`${WEBSITE}/api/products?slug=plantain-chips-250g`);
  const slugBody = await slugResponse.json();
  check("product-by-slug endpoint", slugResponse.ok && slugBody.product?.slug === "plantain-chips-250g");

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exit(1);
});
