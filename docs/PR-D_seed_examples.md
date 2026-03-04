# PR-D: Seed example product reviews

Objetivo: insertar reseñas de ejemplo en `public.product_reviews` vía SQL idempotente. Sin UI; se ejecuta manualmente en Supabase SQL Editor.

## SQL PARA PEGAR EN SUPABASE

```sql
-- PR-D: Seed example product reviews (idempotent)
-- Run in Supabase SQL Editor. Safe to run multiple times.
-- Idempotencia: solo inserta si no existe (product_id, source='seed', title).

with limited_products as (
  select id from public.products where active = true limit 20
),
reviews_template as (
  select * from (values
    (5::smallint, 'Reseña de ejemplo (1)', 'Producto recibido en buen estado. Servicio correcto.'),
    (4::smallint, 'Reseña de ejemplo (2)', 'Buen producto. Cumple lo esperado.'),
    (5::smallint, 'Reseña de ejemplo (3)', 'Muy conforme. Lo recomiendo.')
  ) as t(rating, title, body)
)
insert into public.product_reviews (
  product_id,
  rating,
  title,
  body,
  author_name,
  is_example,
  is_published,
  source
)
select
  p.id,
  r.rating,
  r.title,
  r.body,
  'Cliente DDN (ejemplo)',
  true,
  true,
  'seed'
from limited_products p
cross join reviews_template r
where not exists (
  select 1 from public.product_reviews pr
  where pr.product_id = p.id and pr.source = 'seed' and pr.title = r.title
);
```

---

## Reporte PR-D

| Campo | Valor |
|-------|--------|
| **Archivos tocados** | `ops/sql/2025-03-04_seed_product_reviews_examples.sql`, `docs/PR-D_seed_examples.md` |
| **Idempotencia** | El `INSERT` usa `WHERE NOT EXISTS` sobre `(product_id, source, title)`. Si ya existe una fila con ese producto, source `'seed'` y el mismo título, no se inserta. Títulos fijos por “slot” (1, 2, 3) garantizan que una segunda ejecución no duplique reseñas. |
| **Productos afectados** | Hasta **20** (tantos como productos con `active = true` haya; el script limita a 20). 3 reseñas por producto → hasta 60 filas insertadas en la primera ejecución. |
| **Confirmación** | NO UI. NO API. NO checkout. NO admin. Solo SQL + doc. |
