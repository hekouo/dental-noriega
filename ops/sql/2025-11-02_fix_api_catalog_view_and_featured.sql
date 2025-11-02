begin;

-- Vista compatible con el código: id=uuid, sección desde sections.slug,
-- imagen primaria (o la primera), normalización simple del título.
create or replace view public.api_catalog_with_images as
select
  p.id                                                     as id,            -- uuid
  p.slug                                                  as product_slug,  -- text
  coalesce(s.slug, 'otros')                               as section,       -- text
  p.title                                                 as title,         -- text
  p.price_cents                                           as price_cents,   -- integer
  (
    select pi.url
    from public.product_images pi
    where pi.product_id = p.id
    order by case when pi.is_primary then 0 else 1 end, pi.created_at asc
    limit 1
  )                                                       as image_url,     -- text
  coalesce(p.in_stock, true)                              as in_stock,      -- boolean
  p.stock_qty                                             as stock_qty,     -- integer
  p.active                                                as active,        -- boolean
  lower(
    translate(
      p.title,
      'ÁÉÍÓÚáéíóúÑñ',
      'AEIOUaeiouNn'
    )
  )                                                       as normalized_title
from public.products p
left join public.sections s on s.id = p.section_id;

-- Sanity check rápido
-- select * from public.api_catalog_with_images limit 5;

commit;

