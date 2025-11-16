-- 1) Últimos 5 pedidos (encabezado) con metadata
select
  o.id,
  o.status,
  o.email,
  o.total_cents,
  (o.total_cents / 100.0) as total_mxn,
  (o.metadata->>'subtotal_cents')::int        as meta_subtotal_cents,
  (o.metadata->>'discount_cents')::int        as meta_discount_cents,
  (o.metadata->>'shipping_cost_cents')::int   as meta_shipping_cents,
  o.metadata->>'coupon_code'                  as coupon_code,
  o.metadata->>'shipping_method'             as shipping_method,
  o.created_at
from public.orders o
order by o.created_at desc
limit 5;

-- 2) Items recientes
select
  oi.order_id,
  oi.title,
  oi.unit_price_cents,
  oi.qty,
  oi.created_at
from public.order_items oi
order by oi.created_at desc
limit 10;

-- 3) Totales por pedido (sanity check)
select
  o.id as order_id,
  coalesce(sum(oi.unit_price_cents * oi.qty), 0) as subtotal_cents,
  coalesce(sum(oi.qty), 0)                       as total_items,
  round(coalesce(sum(oi.unit_price_cents * oi.qty), 0) / 100.0, 2) as subtotal_mxn
from public.orders o
left join public.order_items oi on oi.order_id = o.id
group by o.id
order by o.created_at desc
limit 5;
