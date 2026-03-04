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
