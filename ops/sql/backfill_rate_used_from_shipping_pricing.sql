-- Backfill idempotente: rellenar metadata.shipping.rate_used.*_cents desde shipping_pricing
-- cuando shipping_pricing tiene números pero rate_used.*_cents es NULL
--
-- Este script es idempotente: puede ejecutarse múltiples veces sin efectos secundarios.
-- Solo actualiza órdenes donde:
--   1. shipping_pricing.total_cents o carrier_cents es no-null (y numérico)
--   2. shipping.rate_used.price_cents o carrier_cents es NULL/missing
--
-- IMPORTANTE: Preserva otros campos de rate_used (rate_id, provider, service, etc.)

-- Query para verificar cuántas órdenes serían afectadas (ejecutar primero para revisar)
SELECT
  COUNT(*) as affected_orders_count,
  COUNT(DISTINCT id) as unique_orders
FROM public.orders
WHERE
  -- Condición: shipping_pricing tiene números
  (
    (metadata->'shipping_pricing'->>'total_cents') IS NOT NULL
    AND (metadata->'shipping_pricing'->>'total_cents') ~ '^\d+$'
    AND (metadata->'shipping_pricing'->>'total_cents')::numeric > 0
  )
  OR (
    (metadata->'shipping_pricing'->>'carrier_cents') IS NOT NULL
    AND (metadata->'shipping_pricing'->>'carrier_cents') ~ '^\d+$'
    AND (metadata->'shipping_pricing'->>'carrier_cents')::numeric > 0
  )
  -- Y rate_used tiene NULLs o está missing
  AND (
    (metadata->'shipping'->'rate_used'->>'price_cents') IS NULL
    OR (metadata->'shipping'->'rate_used'->>'carrier_cents') IS NULL
    OR (metadata->'shipping'->'rate_used') IS NULL
  );

-- UPDATE idempotente con RETURNING para verificar resultados
UPDATE public.orders
SET metadata = jsonb_set(
  jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{shipping,rate_used}',
    COALESCE(metadata->'shipping'->'rate_used', '{}'::jsonb)
      || jsonb_build_object(
        'price_cents', COALES(
          -- Preservar valor existente si es numérico
          CASE 
            WHEN (metadata->'shipping'->'rate_used'->>'price_cents') ~ '^\d+$' 
            THEN (metadata->'shipping'->'rate_used'->>'price_cents')::numeric
            ELSE NULL
          END,
          -- Rellenar desde shipping_pricing.total_cents si es numérico
          CASE 
            WHEN (metadata->'shipping_pricing'->>'total_cents') ~ '^\d+$' 
            THEN (metadata->'shipping_pricing'->>'total_cents')::numeric
            ELSE NULL
          END
        ),
        'carrier_cents', COALES(
          -- Preservar valor existente si es numérico
          CASE 
            WHEN (metadata->'shipping'->'rate_used'->>'carrier_cents') ~ '^\d+$' 
            THEN (metadata->'shipping'->'rate_used'->>'carrier_cents')::numeric
            ELSE NULL
          END,
          -- Rellenar desde shipping_pricing.carrier_cents si es numérico
          CASE 
            WHEN (metadata->'shipping_pricing'->>'carrier_cents') ~ '^\d+$' 
            THEN (metadata->'shipping_pricing'->>'carrier_cents')::numeric
            ELSE NULL
          END,
          -- Fallback a total_cents si carrier_cents no está disponible
          CASE 
            WHEN (metadata->'shipping_pricing'->>'total_cents') ~ '^\d+$' 
            THEN (metadata->'shipping_pricing'->>'total_cents')::numeric
            ELSE NULL
          END
        ),
        'customer_total_cents', COALES(
          -- Preservar valor existente si es numérico
          CASE 
            WHEN (metadata->'shipping'->'rate_used'->>'customer_total_cents') ~ '^\d+$' 
            THEN (metadata->'shipping'->'rate_used'->>'customer_total_cents')::numeric
            ELSE NULL
          END,
          -- Rellenar desde shipping_pricing.customer_total_cents si es numérico
          CASE 
            WHEN (metadata->'shipping_pricing'->>'customer_total_cents') ~ '^\d+$' 
            THEN (metadata->'shipping_pricing'->>'customer_total_cents')::numeric
            ELSE NULL
          END,
          -- Fallback a total_cents
          CASE 
            WHEN (metadata->'shipping_pricing'->>'total_cents') ~ '^\d+$' 
            THEN (metadata->'shipping_pricing'->>'total_cents')::numeric
            ELSE NULL
          END
        )
      ),
    true
  ),
  '{shipping,_last_write}',
  jsonb_build_object(
    'route', 'backfill-sql',
    'at', NOW()::text,
    'sha', 'backfill-rate-used-from-pricing'
  ),
  true
),
updated_at = NOW()
WHERE
  -- Condición: shipping_pricing tiene números
  (
    (metadata->'shipping_pricing'->>'total_cents') IS NOT NULL
    AND (metadata->'shipping_pricing'->>'total_cents') ~ '^\d+$'
    AND (metadata->'shipping_pricing'->>'total_cents')::numeric > 0
  )
  OR (
    (metadata->'shipping_pricing'->>'carrier_cents') IS NOT NULL
    AND (metadata->'shipping_pricing'->>'carrier_cents') ~ '^\d+$'
    AND (metadata->'shipping_pricing'->>'carrier_cents')::numeric > 0
  )
  -- Y rate_used tiene NULLs o está missing
  AND (
    (metadata->'shipping'->'rate_used'->>'price_cents') IS NULL
    OR (metadata->'shipping'->'rate_used'->>'carrier_cents') IS NULL
    OR (metadata->'shipping'->'rate_used') IS NULL
  )
RETURNING 
  id,
  (metadata->'shipping_pricing'->>'total_cents') as shipping_pricing_total_cents,
  (metadata->'shipping_pricing'->>'carrier_cents') as shipping_pricing_carrier_cents,
  (metadata->'shipping'->'rate_used'->>'price_cents') as rate_used_price_cents,
  (metadata->'shipping'->'rate_used'->>'carrier_cents') as rate_used_carrier_cents;
