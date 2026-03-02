-- PR-A: feedback and reviews (idempotent)
-- Run in Supabase SQL Editor. No destructive operations.

-- A) public.site_feedback
create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_path text null,
  type text not null,
  message text not null,
  rating int2 null check (rating between 1 and 5),
  email text null,
  phone text null,
  user_id uuid null,
  status text not null default 'new',
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_site_feedback_page_path_created_at
  on public.site_feedback (page_path, created_at desc);

alter table public.site_feedback enable row level security;

drop policy if exists "site_feedback_insert_anon_authenticated" on public.site_feedback;
create policy "site_feedback_insert_anon_authenticated" on public.site_feedback
  for insert to anon, authenticated with check (true);

-- B) public.product_reviews
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete cascade,
  rating int2 not null check (rating between 1 and 5),
  title text null,
  body text null,
  author_name text null,
  is_example boolean not null default false,
  is_published boolean not null default false,
  source text null,
  user_id uuid null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_product_reviews_product_id_created_at
  on public.product_reviews (product_id, created_at desc);

create index if not exists idx_product_reviews_product_id_published
  on public.product_reviews (product_id) where is_published = true;

alter table public.product_reviews enable row level security;

drop policy if exists "product_reviews_select_published" on public.product_reviews;
create policy "product_reviews_select_published" on public.product_reviews
  for select to anon, authenticated using (is_published = true);

drop policy if exists "product_reviews_insert_anon_authenticated" on public.product_reviews;
create policy "product_reviews_insert_anon_authenticated" on public.product_reviews
  for insert to anon, authenticated
  with check (
    is_published = false
    and is_example = false
    and (source is null or source = 'user')
  );
