-- ============================================================================
--  Cnaz Foods — Supabase schema
--
--  HOW TO USE
--  1. Open your Supabase project → SQL Editor → New query.
--  2. Paste this entire file and click "Run".
--
--  It is safe to run once on a fresh project. Re-running is also safe:
--  tables use IF NOT EXISTS, policies are dropped and recreated, and the
--  product seed uses ON CONFLICT (slug) DO NOTHING.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
--  PRODUCTS — the shop catalogue. Add more products here (dashboard or SQL);
--  the frontend always reads from this table.
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text not null,
  taste         text,
  ingredients   text[],
  weight_label  text not null,                 -- e.g. '250g'
  price_naira   integer not null check (price_naira >= 0),
  image_url     text not null,
  is_active     boolean not null default true,
  is_featured   boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  PROFILES — one row per authenticated user (created automatically on signup).
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  -- One-time welcome email bookkeeping (written by the server with the
  -- service role after the customer's first Google sign-in). 'sending' is a
  -- short-lived lock so two concurrent sign-ins cannot double-send; 'failed'
  -- rows are retried on the next sign-in.
  welcome_email_status text not null default 'pending'
                       check (welcome_email_status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  CARTS — one saved cart per authenticated user (guests use localStorage).
-- ----------------------------------------------------------------------------
create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  quantity    integer not null check (quantity between 1 and 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- ----------------------------------------------------------------------------
--  ORDERS — written by the server (service role). Guests can order too, so
--  user_id is nullable; signed-in orders are linked to their account.
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique,          -- e.g. CNZ-261001-7QK2
  user_id             uuid references auth.users (id) on delete set null,
  customer_name       text not null,
  customer_email      text not null,
  customer_phone      text not null,
  delivery_address    text not null,
  city                text not null,
  state               text,
  note                text,
  subtotal_naira      integer not null check (subtotal_naira >= 0),
  delivery_fee_naira  integer not null default 0 check (delivery_fee_naira >= 0),
  total_naira         integer not null check (total_naira >= 0),
  status              text not null default 'received'
                      check (status in ('received', 'confirmed', 'delivered', 'cancelled')),
  email_status        text not null default 'pending'
                      check (email_status in ('pending', 'sent', 'failed', 'skipped')),
  -- Online payment (Paystack). The customer pays the snack total online;
  -- delivery is still confirmed by phone. All writes happen server-side
  -- (service role) after Paystack verify/webhook confirms the charge.
  payment_status      text not null default 'unpaid'
                      check (payment_status in ('unpaid', 'pending', 'paid', 'failed')),
  payment_reference   text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now()
);

-- Snapshot of name/weight/price at purchase time, so order history never
-- changes when the catalogue is edited later.
create table if not exists public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        uuid references public.products (id) on delete set null,
  product_name      text not null,
  product_weight    text,
  unit_price_naira  integer not null check (unit_price_naira >= 0),
  quantity          integer not null check (quantity >= 1),
  line_total_naira  integer not null check (line_total_naira >= 0)
);

-- Upgrade path for databases created before online payment existed.
-- (The create table above only applies to fresh databases.)
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed'));
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists paid_at timestamptz;

-- ----------------------------------------------------------------------------
--  INDEXES
-- ----------------------------------------------------------------------------
create index if not exists products_active_idx    on public.products (is_active, sort_order);
create index if not exists carts_user_idx         on public.carts (user_id);
create index if not exists cart_items_cart_idx    on public.cart_items (cart_id);
create index if not exists orders_user_idx        on public.orders (user_id, created_at desc);
create index if not exists order_items_order_idx  on public.order_items (order_id);

-- ----------------------------------------------------------------------------
--  updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  Auto-create a profile row when a user signs up (Google auth).
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
--  ROW LEVEL SECURITY
--  Customers can only ever see their own cart and their own orders.
--  Orders are written by the server with the service role (which bypasses
--  RLS), so there is deliberately no client-side insert/update policy.
-- ----------------------------------------------------------------------------
alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.carts       enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- products: everyone can read active products
drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  using (is_active);

-- profiles: users manage only their own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- carts: users manage only their own cart
drop policy if exists "Users manage own cart" on public.carts;
create policy "Users manage own cart"
  on public.carts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- cart_items: only through a cart the user owns
drop policy if exists "Users manage own cart items" on public.cart_items;
create policy "Users manage own cart items"
  on public.cart_items for all
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  );

-- orders: users can read only their own orders
drop policy if exists "Users view own orders" on public.orders;
create policy "Users view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- order_items: only items of the user's own orders
drop policy if exists "Users view own order items" on public.order_items;
create policy "Users view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
--  GRANTS (Supabase usually applies these by default; explicit for safety)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.carts to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

-- ----------------------------------------------------------------------------
--  SEED — the three Cnaz Foods products provided by the business.
--  (Prices/weights/descriptions come from the business, not invented.)
--  More products can be added later with simple INSERTs — the shop reads
--  everything from this table.
-- ----------------------------------------------------------------------------
insert into public.products
  (slug, name, description, taste, ingredients, weight_label, price_naira, image_url, is_active, is_featured, sort_order)
values
  (
    'plantain-chips-250g',
    'Cnaz Foods Plantain Chips',
    'Made from quality plantains, carefully fried to a crisp and lightly seasoned for that satisfying taste. Perfect for everyday snacking, sharing with friends, parties, or enjoying on the go.',
    'Crunchy & lightly salted',
    null,
    '250g',
    2300,
    '/images/products/plantain-chips-250g.png',
    true,
    true,
    1
  ),
  (
    'peanuts-750g',
    'Cnaz Foods Peanuts',
    'Cnaz Foods Peanuts are carefully selected and roasted to deliver a satisfying crunch and rich, natural peanut taste. A nutritious snack that''s perfect for home, the office, events, or enjoying on the go.',
    'Fresh, crunchy & tasty',
    array['Groundnut', 'Salt'],
    '750g',
    4000,
    '/images/products/peanuts-750g-clean.png',
    true,
    true,
    2
  ),
  (
    'groundnut-500g',
    'Cnaz Foods Groundnut',
    'Cnaz Foods Groundnut is carefully selected and seasoned with just the right touch of salt for a rich, satisfying crunch. A perfect snack for home, the office, events, or on the go.',
    'Fresh, crunchy & tasty',
    array['Groundnut', 'Salt'],
    '500g',
    2700,
    '/images/products/groundnut-500g.png',
    true,
    true,
    3
  )
on conflict (slug) do nothing;
