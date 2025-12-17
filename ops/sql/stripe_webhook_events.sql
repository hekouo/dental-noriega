-- Tabla para registrar eventos de Stripe webhook y garantizar idempotencia
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY, -- event.id de Stripe (ej: "evt_xxx")
  type TEXT NOT NULL, -- Tipo de evento (ej: "payment_intent.succeeded")
  order_id UUID, -- ID de la orden relacionada (si se puede resolver)
  payment_intent_id TEXT, -- ID del PaymentIntent (si aplica)
  charge_id TEXT, -- ID del Charge (si aplica, para refunds)
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_order_id 
  ON public.stripe_webhook_events(order_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_payment_intent_id 
  ON public.stripe_webhook_events(payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_charge_id 
  ON public.stripe_webhook_events(charge_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type 
  ON public.stripe_webhook_events(type);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at 
  ON public.stripe_webhook_events(processed_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE public.stripe_webhook_events IS 
  'Registro de eventos de Stripe webhook para garantizar idempotencia. Cada event.id de Stripe se registra una sola vez.';

COMMENT ON COLUMN public.stripe_webhook_events.id IS 
  'ID único del evento de Stripe (event.id). Usado como clave primaria para idempotencia.';

COMMENT ON COLUMN public.stripe_webhook_events.type IS 
  'Tipo de evento de Stripe (ej: payment_intent.succeeded, charge.refunded).';

COMMENT ON COLUMN public.stripe_webhook_events.order_id IS 
  'ID de la orden relacionada, extraído de metadata.order_id del PaymentIntent.';

COMMENT ON COLUMN public.stripe_webhook_events.payment_intent_id IS 
  'ID del PaymentIntent de Stripe (si aplica al evento).';

COMMENT ON COLUMN public.stripe_webhook_events.charge_id IS 
  'ID del Charge de Stripe (útil para eventos de refund).';

