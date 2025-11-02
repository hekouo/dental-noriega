-- === 0) Prerrequisitos mínimos sin romper lo existente =======================
-- Crea tablas si no existen. Añade columnas si faltan. No borres nada.

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  section_slug text,              -- sección por slug
  slug text unique,
  title text,
  price numeric,
  in_stock boolean default true
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  url text,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.featured (
  position int not null default 0,
  product_id uuid,
  slug text,
  unique (position)
);

-- Asegura columnas esperadas (idempotente)
alter table public.sections
  add column if not exists slug text,
  add column if not exists name text;

alter table public.products
  add column if not exists section_slug text,
  add column if not exists slug text,
  add column if not exists title text,
  add column if not exists price numeric,
  add column if not exists in_stock boolean default true;

alter table public.product_images
  add column if not exists product_id uuid,
  add column if not exists url text,
  add column if not exists is_primary boolean default false,
  add column if not exists created_at timestamptz default now();

alter table public.featured
  add column if not exists slug text,
  add column if not exists product_id uuid;

-- === 1) Resolver featured por slug ===========================================
-- Si featured tiene slug pero no product_id, complétalo.

update public.featured f
set product_id = p.id
from public.products p
where f.product_id is null
  and f.slug is not null
  and p.slug = f.slug;

-- === 2) Vista que consume el código: api_catalog_with_images ==================
-- Regresa SIEMPRE una imagen (primaria si existe, si no la primera),
-- coalesce en in_stock y section, y columnas canónicas que usa el frontend.

create or replace view public.api_catalog_with_images as
select
  p.id,
  p.slug,
  coalesce(p.title, p.slug) as title,
  coalesce(p.section_slug, 'otros') as section,
  coalesce(p.in_stock, true) as in_stock,
  coalesce(p.price, 0) as price,
  -- imagen primaria si hay, de lo contrario cualquiera
  coalesce(
    (
      select i.url
      from public.product_images i
      where i.product_id = p.id and coalesce(i.is_primary, false) = true
      order by i.created_at asc
      limit 1
    ),
    (
      select i2.url
      from public.product_images i2
      where i2.product_id = p.id
      order by i2.created_at asc
      limit 1
    )
  ) as image_url
from public.products p;

-- === 3) RLS de solo lectura pública (idempotente) ============================
alter table public.sections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.featured enable row level security;

drop policy if exists sections_read on public.sections;
create policy sections_read on public.sections
for select using (true);

drop policy if exists products_read on public.products;
create policy products_read on public.products
for select using (true);

drop policy if exists product_images_read on public.product_images;
create policy product_images_read on public.product_images
for select using (true);

drop policy if exists featured_read on public.featured;
create policy featured_read on public.featured
for select using (true);

-- === 4) Seed mínimo opcional (no duplica gracias a ON CONFLICT) ==============
insert into public.sections (slug, name) values
  ('consumibles','Consumibles'),
  ('equipos','Equipos')
on conflict (slug) do update set name = excluded.name;

-- Si faltan productos, siembra 3 de ejemplo
insert into public.products (slug, title, section_slug, price, in_stock) values
  ('arco-niti-redondo-12-14-16-18-paquete-con-10','Arco NITI redondo 12/14/16/18 (paquete 10)','consumibles',120, true),
  ('arco-niti-rectangular-paquete-con-10','Arco NITI rectangular (paquete 10)','consumibles',140, true),
  ('aeropulidor','Aeropulidor','equipos', 1999, true)
on conflict (slug) do nothing;

-- Vincula alguna imagen si no hay (puedes reemplazar por tus URLs reales)
insert into public.product_images (product_id, url, is_primary)
select p.id, 'https://lh3.googleusercontent.com/d/placeholder', true
from public.products p
left join public.product_images i on i.product_id = p.id
where i.id is null;

-- Garantiza 8 destacados ordenados; si ya existen, respeta los existentes
-- y rellena con cualquier producto faltante.
with desired as (
  select row_number() over (order by p.slug) - 1 as position, p.id as pid
  from public.products p
  limit 8
)
insert into public.featured (position, product_id)
select d.position, d.pid
from desired d
left join public.featured f on f.position = d.position
where f.position is null;

