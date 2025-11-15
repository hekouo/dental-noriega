-- ¿Existen las tablas?
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('orders', 'order_items')
order by table_name;

-- Conteo rápido (0 es válido si aún no hay ventas)
select
  (select count(*) from public.orders)      as orders,
  (select count(*) from public.order_items) as order_items;

-- Sanity extra: últimas fechas si hay datos
select
  (select max(created_at) from public.orders)      as last_order_at,
  (select max(created_at) from public.order_items) as last_item_created_at;

