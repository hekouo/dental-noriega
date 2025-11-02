-- 1) Vista compatible con el código: id como TEXT
create or replace view public.api_catalog_with_images as
select
  p.id::text                          as id,                -- << text, no uuid
  p.slug                              as product_slug,
  coalesce(p.section,'otros')         as section,
  coalesce(p.title,'(sin título)')    as title,
  coalesce(p.price_cents,0)           as price_cents,
  pi.url                               as image_url,
  coalesce(p.in_stock,true)           as in_stock,
  coalesce(p.stock_qty,0)             as stock_qty,
  coalesce(p.active,true)             as active,
  coalesce(p.sku,'')                  as sku,
  lower(
    translate(
      coalesce(p.title,''),
      'ÁÉÍÓÚÜÑáéíóúüñ',
      'AEIOUUNaeiouun'
    )
  )                                   as normalized_title
from public.products p
left join lateral (
  select url
  from public.product_images i
  where i.product_id = p.id
  order by case when i.is_primary then 0 else 1 end, i.created_at asc
  limit 1
) pi on true;

-- 2) Asegurar featured.catalog_id poblado con id (text)
update public.featured f
set catalog_id = p.id::text
from public.products p
where f.product_id = p.id and (f.catalog_id is null or f.catalog_id = '');

-- 3) Verificaciones rápidas
-- select count(*) from public.api_catalog_with_images;
-- select position, catalog_id from public.featured order by position;

