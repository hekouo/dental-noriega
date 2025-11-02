begin;

-- Asegurar tabla featured (no cambia si ya existe)
create table if not exists public.featured (
  product_id uuid primary key references public.products(id) on delete cascade,
  position   integer not null unique,
  created_at timestamptz not null default now()
);

-- Lista EXACTA de slugs y posiciones que DEBEN quedar
create temporary table desired_featured (
  slug text primary key,
  position integer not null unique
) on commit drop;

insert into desired_featured (slug, position) values
  ('arco-niti-rectangular-paquete-con-10', 0),
  ('arco-niti-redondo-12-14-16-18-paquete-con-10', 1),
  ('bracket-azdent-malla-100-colado', 2),
  ('bracket-ceramico-roth-azdent', 3),
  ('boton-con-malla-ceramico-kit-con-10', 4),
  ('aeropulidor', 5),
  ('matrices-kit-con-36', 6),
  ('pinza-corte-distal-cabeza-mini-azdent', 7);

-- Verifica que todos los slugs existan en products (NOTICE si faltan)
do $$
declare faltantes int;
begin
  select count(*) into faltantes
  from desired_featured d
  left join public.products p on p.slug = d.slug
  where p.id is null;

  if faltantes > 0 then
    raise notice 'Hay % slugs que no existen en public.products. Revisa desired_featured.', faltantes;
  end if;
end $$;

-- Upsert por product_id (no duplica; actualiza posición si ya estaba)
merge into public.featured as f
using (
  select p.id as product_id, d.position
  from desired_featured d
  join public.products p on p.slug = d.slug
) as src
on f.product_id = src.product_id
when matched then
  update set position = src.position
when not matched then
  insert (product_id, position) values (src.product_id, src.position);

-- Borrar de featured lo que NO esté en la lista exacta
delete from public.featured f
where f.product_id not in (
  select p.id
  from desired_featured d
  join public.products p on p.slug = d.slug
);

-- Verificación final: deben salir 8 filas con imagen
select f.position, p.slug, v.image_url, coalesce(v.in_stock,true) as in_stock
from public.featured f
join public.products p on p.id = f.product_id
left join public.api_catalog_with_images v on v.id = p.id
order by f.position;

commit;

