-- Últimos 5 pedidos (encabezado)
select
  id,
  status,
  email,
  total_cents,
  (total_cents / 100.0) as total_mxn,
  payment_provider,
  payment_id,
  created_at
from public.orders
order by created_at desc
limit 5;

-- Items recientes con nombre del producto (si existe relación)
select
  oi.order_id,
  coalesce(p.title, oi.title) as product_name,
  oi.unit_price_cents,
  (oi.unit_price_cents / 100.0) as unit_price_mxn,
  oi.qty,
  oi.created_at
from public.order_items oi
left join public.products p on p.id = oi.product_id
order by oi.created_at desc
limit 10;

-- Totales por pedido (sanity check)
select
  oi.order_id,
  sum(oi.unit_price_cents * oi.qty)               as subtotal_cents,
  (sum(oi.unit_price_cents * oi.qty) / 100.0)     as subtotal_mxn,
  sum(oi.qty)                                     as total_items
from public.order_items oi
group by oi.order_id
order by subtotal_cents desc
limit 5;

