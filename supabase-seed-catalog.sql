-- Extensiones útiles
create extension if not exists "uuid-ossp";

-- 1) Secciones
create table if not exists public.sections(
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,          -- ej: 'consumibles', 'equipos'
  title text not null,               -- ej: 'Consumibles'
  position int default 0,
  created_at timestamp with time zone default now()
);

-- 2) Productos
create table if not exists public.products(
  id uuid primary key default uuid_generate_v4(),
  section_key text references public.sections(key) on delete set null,
  slug text not null,
  title text not null,
  price numeric(12,2) not null default 0,
  image_url text,
  in_stock boolean default true,
  stock_qty int,
  description text,
  sku text,
  featured boolean default false,
  active boolean default true,
  created_at timestamp with time zone default now(),
  unique(section_key, slug)
);

-- 3) Políticas RLS: solo lectura pública anónima (SELECT)
alter table public.sections enable row level security;
alter table public.products enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sections' and policyname='sections_select_public'
  ) then
    create policy sections_select_public on public.sections
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='products' and policyname='products_select_public'
  ) then
    create policy products_select_public on public.products
      for select using (true);
  end if;
end$$;

-- 4) Vista api_catalog_with_images (compatible con el código actual)
create or replace view public.api_catalog_with_images as
select
  p.id::text as id,
  coalesce(s.key, 'sin-seccion') as section,
  p.slug as product_slug,
  p.title,
  round(p.price * 100)::int as price_cents,
  p.image_url,
  p.in_stock,
  p.stock_qty,
  p.active,
  lower(translate(p.title, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) as normalized_title,
  p.sku
from public.products p
left join public.sections s on p.section_key = s.key
where p.active = true;

-- 5) Tabla featured (para productos destacados)
create table if not exists public.featured(
  id uuid primary key default uuid_generate_v4(),
  catalog_id text not null,  -- referencia a api_catalog_with_images.id
  position int not null default 0,
  created_at timestamp with time zone default now(),
  unique(catalog_id)
);

alter table public.featured enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='featured' and policyname='featured_select_public'
  ) then
    create policy featured_select_public on public.featured
      for select using (true);
  end if;
end$$;

-- 6) Seed mínimo para que se vea algo
insert into public.sections(key, title, position)
values
  ('consumibles','Consumibles',1),
  ('equipos','Equipos',2)
on conflict (key) do update set title=excluded.title, position=excluded.position;

insert into public.products(section_key, slug, title, price, image_url, in_stock, stock_qty, description, sku, featured, active)
values
  ('consumibles','guantes-nitrilo-azul','Guantes de Nitrilo Azul (Caja 100)', 139.00,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b', true, 50,
    'Guantes de nitrilo libres de látex. Tallas S/M/L.', 'GNT-001', true, true),
  ('consumibles','arco-niti-redondo-014','Arco NITI Redondo .014 (paquete x10)', 189.00,
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5', true, 30,
    'Paquete con 10 unidades. Uso ortodoncia.', 'NITI-014', true, true),
  ('equipos','lampara-fotocurado-x200','Lámpara de Fotocurado X200', 2499.00,
    'https://images.unsplash.com/photo-1582719478185-2a9b8f3a00f8', true, 5,
    'Alta intensidad, batería recargable.', 'EQU-X200', false, true)
on conflict (section_key, slug) do update set
  title=excluded.title, price=excluded.price, image_url=excluded.image_url,
  in_stock=excluded.in_stock, stock_qty=excluded.stock_qty, description=excluded.description,
  sku=excluded.sku, featured=excluded.featured, active=excluded.active;

-- 7) Populate featured table con productos destacados
insert into public.featured(catalog_id, position)
select p.id::text, row_number() over (order by p.created_at) as position
from public.products p
where p.featured = true and p.active = true
on conflict (catalog_id) do update set position=excluded.position;

