-- Agregar columna shipping_shipment_id y tabla shipping_events para tracking visual tipo Amazon-lite
-- Ejecutar manualmente en Supabase antes de usar webhook matching por shipping_shipment_id
-- Fecha: 2025-01-15

-- 1. Agregar columna shipping_shipment_id a orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_shipment_id TEXT;

COMMENT ON COLUMN public.orders.shipping_shipment_id IS 'ID del shipment en Skydropx (usado para matching confiable en webhooks)';

-- 2. Backfill: copiar shipment_id desde metadata a columna
UPDATE public.orders
SET shipping_shipment_id = (metadata->'shipping'->>'shipment_id')
WHERE shipping_shipment_id IS NULL
  AND metadata ? 'shipping'
  AND (metadata->'shipping'->>'shipment_id') IS NOT NULL;

-- 3. Crear tabla shipping_events para timeline de eventos de envío
CREATE TABLE IF NOT EXISTS public.shipping_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'skydropx',
  provider_event_id TEXT NULL,
  raw_status TEXT NULL,
  mapped_status TEXT NULL,
  tracking_number TEXT NULL,
  label_url TEXT NULL,
  payload JSONB NULL, -- Opcional: guardar subset sin PII (sin direcciones completas, teléfonos, emails)
  occurred_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.shipping_events IS 'Timeline de eventos de envío desde proveedores externos (ej: Skydropx webhooks)';
COMMENT ON COLUMN public.shipping_events.order_id IS 'ID de la orden asociada';
COMMENT ON COLUMN public.shipping_events.provider IS 'Proveedor de envío (ej: "skydropx")';
COMMENT ON COLUMN public.shipping_events.provider_event_id IS 'ID del evento en el proveedor (usado para idempotencia)';
COMMENT ON COLUMN public.shipping_events.raw_status IS 'Estado crudo recibido del proveedor';
COMMENT ON COLUMN public.shipping_events.mapped_status IS 'Estado mapeado a estado canónico del sistema';
COMMENT ON COLUMN public.shipping_events.tracking_number IS 'Número de rastreo asociado al evento';
COMMENT ON COLUMN public.shipping_events.label_url IS 'URL de la etiqueta si aplica';
COMMENT ON COLUMN public.shipping_events.payload IS 'Payload del evento (sin PII: sin direcciones completas, teléfonos, emails)';
COMMENT ON COLUMN public.shipping_events.occurred_at IS 'Timestamp cuando ocurrió el evento según el proveedor';
COMMENT ON COLUMN public.shipping_events.created_at IS 'Timestamp cuando se guardó el evento en nuestra DB';

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_shipping_events_order_id_created_at
  ON public.shipping_events(order_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_events_provider_event_id_unique
  ON public.shipping_events(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_shipping_shipment_id
  ON public.orders(shipping_shipment_id)
  WHERE shipping_shipment_id IS NOT NULL;
