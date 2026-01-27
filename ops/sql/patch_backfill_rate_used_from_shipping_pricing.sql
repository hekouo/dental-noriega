-- Backfill idempotente: rellenar metadata.shipping.rate_used.*_cents desde shipping_pricing
-- cuando shipping_pricing tiene números pero rate_used.*_cents es NULL
--
-- Este script es idempotente: puede ejecutarse múltiples veces sin efectos secundarios.
-- Solo actualiza órdenes donde:
--   1. shipping_pricing.total_cents o carrier_cents es no-null
--   2. shipping.rate_used.price_cents o carrier_cents es NULL
--
-- IMPORTANTE: Preserva otros campos de rate_used (rate_id, provider, service, etc.)

UPDATE public.orders
SET metadata = jsonb_set(
  jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{shipping,rate_used}',
    COALESCE(metadata->'shipping'->'rate_used', '{}'::jsonb)
      || jsonb_build_object(
        'price_cents', COALESCE(
          (metadata->'shipping'->'rate_used'->>'price_cents')::numeric,
          (metadata->'shipping_pricing'->>'total_cents')::numeric
        ),
        'carrier_cents', COALESCE(
          (metadata->'shipping'->'rate_used'->>'carrier_cents')::numeric,
          (metadata->'shipping_pricing'->>'carrier_cents')::numeric
        ),
        'customer_total_cents', COALESCE(
          (metadata->'shipping'->'rate_used'->>'customer_total_cents')::numeric,
          (metadata->'shipping_pricing'->>'customer_total_cents')::numeric,
          (metadata->'shipping_pricing'->>'total_cents')::numeric
        )
      ),
    true
  ),
  '{shipping,_last_write}',
  jsonb_build_object(
    'route', 'backfill-sql',
    'at', NOW()::text,
    'sha', 'backfill'
  ),
  true
),
updated_at = NOW()
WHERE
  -- Condición: shipping_pricing tiene números
  (
    (metadata->'shipping_pricing'->>'total_cents') IS NOT NULL
    OR (metadata->'shipping_pricing'->>'carrier_cents') IS NOT NULL
  )
  -- Y rate_used tiene nulls o no existe
  AND (
    (metadata->'shipping'->'rate_used'->>'price_cents') IS NULL
    OR (metadata->'shipping'->'rate_used'->>'carrier_cents') IS NULL
    OR metadata->'shipping'->'rate_used' IS NULL
  )
  -- Y shipping_pricing tiene valores numéricos válidos (> 0)
  AND (
    COALESCE((metadata->'shipping_pricing'->>'total_cents')::numeric, 0) > 0
    OR COALESCE((metadata->'shipping_pricing'->>'carrier_cents')::numeric, 0) > 0
  );

-- Verificar resultados (opcional, comentar en producción)
-- SELECT
--   id,
--   metadata #>> '{shipping,rate_used,price_cents}' as ru_price,
--   metadata #>> '{shipping,rate_used,carrier_cents}' as ru_carrier,
--   metadata #>> '{shipping_pricing,total_cents}' as sp_total,
--   metadata #>> '{shipping_pricing,carrier_cents}' as sp_carrier
-- FROM public.orders
-- WHERE metadata->'shipping_pricing' IS NOT NULL
-- LIMIT 10;
