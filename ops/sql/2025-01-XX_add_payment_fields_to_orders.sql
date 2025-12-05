-- Agregar campos de método y estado de pago a la tabla orders
-- Idempotente: usa IF NOT EXISTS para evitar errores si ya existen

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public.orders.payment_method IS
  'Método de pago utilizado: "card" (Stripe), "bank_transfer" (transferencia), "cash" (efectivo)';

COMMENT ON COLUMN public.orders.payment_status IS
  'Estado del pago: "pending", "paid", "canceled"';

-- Inicializar datos para pedidos existentes de Stripe,
-- usando payment_provider y status

UPDATE public.orders
SET
  payment_method = COALESCE(
    payment_method,
    CASE
      WHEN payment_provider = 'stripe' THEN 'card'
      ELSE payment_method
    END
  ),
  payment_status = COALESCE(
    payment_status,
    CASE
      WHEN payment_provider = 'stripe' AND status = 'paid' THEN 'paid'
      WHEN payment_provider = 'stripe' AND status = 'pending' THEN 'pending'
      ELSE payment_status
    END
  )
WHERE payment_provider = 'stripe';
