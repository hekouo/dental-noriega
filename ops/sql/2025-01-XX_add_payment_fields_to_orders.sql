-- Agregar campos de método y estado de pago a la tabla orders
-- Ejecutar manualmente en Supabase
-- Idempotente: usa IF NOT EXISTS para evitar errores si ya existen

-- Agregar columnas para información de pago
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public.orders.payment_method IS 'Método de pago utilizado: "card" (Stripe), "bank_transfer" (transferencia), "cash" (efectivo)';
COMMENT ON COLUMN public.orders.payment_status IS 'Estado del pago: "pending", "paid", "canceled"';

-- Actualizar pedidos existentes con Stripe para que tengan payment_method = "card" y payment_status = "paid"
-- Solo si tienen stripe_session_id y status = "paid"
UPDATE public.orders
SET 
  payment_method = 'card',
  payment_status = CASE 
    WHEN status = 'paid' THEN 'paid'
    WHEN status = 'pending' AND stripe_session_id IS NOT NULL THEN 'pending'
    ELSE payment_status
  END
WHERE stripe_session_id IS NOT NULL
  AND (payment_method IS NULL OR payment_status IS NULL);

