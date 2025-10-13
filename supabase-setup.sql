-- Ejecutar este script en tu proyecto de Supabase (SQL Editor)

-- Usuarios (perfil extendido de auth.users)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  points_balance int not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS para user_profiles
alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- Direcciones
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  label text,
  street text,
  ext_no text,
  int_no text,
  neighborhood text,
  city text,
  state text,
  zip text,
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table public.addresses enable row level security;

create policy "Users can manage own addresses"
  on public.addresses for all
  using (auth.uid() = user_id);

-- Carritos
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.carts enable row level security;

create policy "Users can manage own cart"
  on public.carts for all
  using (auth.uid() = user_id);

-- Items del carrito
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references public.carts(id) on delete cascade,
  sku text not null,
  name text not null,
  price numeric(12,2),
  qty int not null check (qty > 0),
  created_at timestamptz default now()
);

alter table public.cart_items enable row level security;

create policy "Users can manage own cart items"
  on public.cart_items for all
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
    )
  );

-- Pedidos
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  fulfillment_method text not null,
  address_id uuid references public.addresses(id),
  pickup_location text,
  contact_name text,
  contact_phone text,
  contact_email text,
  subtotal numeric(12,2) not null,
  shipping_cost numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  points_redeemed int not null default 0,
  total numeric(12,2) not null,
  stripe_session_id text,
  created_at timestamptz default now()
);

alter table public.orders enable row level security;

create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can insert own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

-- Items de pedidos
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  sku text not null,
  name text not null,
  price numeric(12,2) not null,
  qty int not null check (qty > 0)
);

alter table public.order_items enable row level security;

create policy "Users can view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

-- Movimientos de puntos
create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null,
  points int not null,
  note text,
  created_at timestamptz default now()
);

alter table public.points_ledger enable row level security;

create policy "Users can view own points"
  on public.points_ledger for select
  using (auth.uid() = user_id);

-- Trigger para crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, created_at, updated_at)
  values (new.id, new.raw_user_meta_data->>'full_name', now(), now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Función para actualizar updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_user_profile_updated on public.user_profiles;
create trigger on_user_profile_updated
  before update on public.user_profiles
  for each row execute procedure public.handle_updated_at();

