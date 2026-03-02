# PR-A: Feedback y reseñas (solo DB + APIs)

Objetivo: tablas `site_feedback` y `product_reviews`, RLS, y rutas `/api/feedback` (POST) y `/api/reviews` (GET + POST). Sin UI.

## Archivos tocados
- `ops/sql/2026-02-22_feedback_and_reviews.sql`
- `docs/PR-A_feedback_reviews.md`
- `src/app/api/feedback/route.ts`
- `src/app/api/reviews/route.ts`

---

## SQL PARA PEGAR EN SUPABASE

Ejecutar en **Supabase Dashboard → SQL Editor**. Idempotente (create if not exists, drop policy if exists).

```sql
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
```

---

## APIs

- **POST /api/feedback** — Body: `type` (bug|idea|opinion|other), `message` (min 10), opcional: `rating` 1–5, `email`, `phone`, `page_path`. Throttle 3 req/10 min por IP. Res: 201 `{ status: "ok" }`.
- **GET /api/reviews?product_id=uuid** — Res: `product_id`, `average_rating`, `review_count`, `real_reviews`, `example_reviews`.
- **POST /api/reviews** — Body: `product_id`, `rating` 1–5, opcional: `title`, `body` (min 10), `author_name`. Inserta con `is_published=false`, `is_example=false`, `source='user'`. Res: 200 `{ message: "Gracias, tu reseña será revisada" }`.

---

Confirmación: **NO UI incluida**. No se toca checkout, admin, stripe, shipping, orders.

---

## Reporte para PR description

### Lista de archivos tocados
- `ops/sql/2026-02-22_feedback_and_reviews.sql`
- `docs/PR-A_feedback_reviews.md`
- `src/app/api/feedback/route.ts`
- `src/app/api/reviews/route.ts`

### Bloque SQL completo para Supabase
Véase sección **SQL PARA PEGAR EN SUPABASE** arriba (mismo contenido que `ops/sql/2026-02-22_feedback_and_reviews.sql`).

### 3 ejemplos de prueba (curl)

```bash
# 1) POST feedback
curl -s -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"type":"opinion","message":"Me gustaría ver más filtros en la búsqueda.","rating":4}'

# 2) GET reviews (sustituir PRODUCT_UUID por un uuid de products)
curl -s "http://localhost:3000/api/reviews?product_id=PRODUCT_UUID"

# 3) POST review (sustituir PRODUCT_UUID)
curl -s -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"product_id":"PRODUCT_UUID","rating":5,"title":"Muy buen producto","body":"Llegó rápido y bien empaquetado.","author_name":"Ana"}'
```

### Confirmación
**NO UI incluida.** Solo DB (SQL) + RLS + APIs. No se modifican checkout, admin, stripe, shipping, orders.
