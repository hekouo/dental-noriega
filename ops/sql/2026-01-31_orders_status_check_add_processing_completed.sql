-- ============================================================================
-- Fix: orders_status_check constraint
-- ============================================================================
-- Contexto: En public.orders existe un constraint orders_status_check con
-- definición que solo permite: pending, paid, failed, canceled
-- Esto rompe el admin cuando intenta setear status='processing' (error 23514).
--
-- Este script debe aplicarse manualmente en Supabase SQL Editor.
-- Es idempotente: puede ejecutarse varias veces sin efectos adversos.
-- ============================================================================

-- Drop del constraint existente (si existe)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

-- Recrear con valores expandidos
-- Valores existentes: pending, paid, failed, canceled
-- Valores nuevos: processing, completed (para flujo admin), cancelled (alias UK)
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status = ANY (ARRAY[
      'pending'::text,
      'paid'::text,
      'failed'::text,
      'canceled'::text,
      'cancelled'::text,
      'processing'::text,
      'completed'::text
    ])
  );

-- Comentario para documentar
COMMENT ON CONSTRAINT orders_status_check ON public.orders IS
  'Valores permitidos: pending, paid, failed, canceled, cancelled, processing, completed';
