begin;

-- 1) Recrear la vista con id=UUID y sin depender de columnas que no existen en products
drop view if exists public.api_catalog_with_images;

create view public.api_catalog_with_images as
select
  p.id                                          as id,            -- UUID, se queda así
  p.slug                                        as product_slug,
  coalesce(nullif(s.slug, ''), 'otros')         as section,
  coalesce(p.title, '(sin título)')             as title,
  coalesce(p.price_cents, 0)                    as price_cents,
  pi.url                                        as image_url,

  -- Flags inventario: defaults porque no existen en products
  true                                          as in_stock,
  0                                             as stock_qty,
  true                                          as active,

  coalesce(p.sku, '')                           as sku,
  lower(
    translate(
      coalesce(p.title,''),
      'ÁÉÍÓÚÜÑáéíóúüñ',
      'AEIOUUNaeiouun'
    )
  )                                             as normalized_title
from public.products p
left join public.sections s
  on s.id = p.section_id
left join lateral (
  select url
  from public.product_images i
  where i.product_id = p.id
  order by case when i.is_primary then 0 else 1 end, i.created_at asc
  limit 1
) pi on true;

-- 2) Backfill de featured.catalog_id si ESA columna existe y es texto
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'featured'
      and column_name  = 'catalog_id'
      and data_type in ('text','character varying')
  ) then
    update public.featured f
    set catalog_id = p.id::text
    from public.products p
    where f.product_id = p.id
      and (f.catalog_id is null or f.catalog_id = '');
  end if;
end $$;

commit;

-- 3) Chequeo rápido (opcional)
-- select count(*) as rows_in_view from public.api_catalog_with_images;
-- select position, product_id, catalog_id from public.featured order by position limit 8;
