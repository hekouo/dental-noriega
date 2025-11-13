-- SQL de verificación rápida en Supabase
-- Ejecuta esto con el order_id que falló:

-- Verificar orden
SELECT 
  id, 
  status, 
  total,
  total * 100 as total_cents
FROM public.orders 
WHERE id = '435d3acc-4800-409b-a4e8-853d415d8fcf';

-- Verificar items y recomputar total
SELECT 
  count(*) as items,
  coalesce(sum(qty * price), 0) as recomputed_total_decimal,
  coalesce(sum(qty * price * 100), 0) as recomputed_total_cents
FROM public.order_items
WHERE order_id = '435d3acc-4800-409b-a4e8-853d415d8fcf';

-- Si total_cents es 0 o recomputed_total_cents da 0, ahí está el origen del 400.

