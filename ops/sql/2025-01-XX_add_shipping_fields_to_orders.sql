-- Agregar campos de shipping de Skydropx a la tabla orders
-- Ejecutar manualmente en Supabase

-- Agregar columnas para información de shipping de Skydropx
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_provider TEXT,
  ADD COLUMN IF NOT EXISTS shipping_service_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_rate_ext_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_eta_min_days INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_eta_max_days INTEGER;

-- Comentarios para documentación
COMMENT ON COLUMN public.orders.shipping_provider IS 'Proveedor de envío (ej: "skydropx", "estafeta", "dhl")';
COMMENT ON COLUMN public.orders.shipping_service_name IS 'Nombre del servicio de envío seleccionado';
COMMENT ON COLUMN public.orders.shipping_price_cents IS 'Precio del envío en centavos MXN';
COMMENT ON COLUMN public.orders.shipping_rate_ext_id IS 'ID externo de la tarifa de Skydropx';
COMMENT ON COLUMN public.orders.shipping_eta_min_days IS 'Días estimados mínimos de entrega';
COMMENT ON COLUMN public.orders.shipping_eta_max_days IS 'Días estimados máximos de entrega';

