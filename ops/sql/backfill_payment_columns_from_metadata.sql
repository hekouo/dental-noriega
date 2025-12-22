-- Backfill script: Migrar payment_provider y payment_id desde metadata a columnas reales
-- Ejecutar en Supabase SQL Editor
-- Este script es idempotente: solo actualiza cuando las columnas están NULL

-- Actualizar payment_provider desde metadata
UPDATE public.orders
SET payment_provider = CASE
  -- Si metadata tiene payment_provider explícito
  WHEN metadata->>'payment_provider' IS NOT NULL 
    THEN metadata->>'payment_provider'
  -- Si metadata tiene stripe_payment_intent_id, inferir 'stripe'
  WHEN metadata->>'stripe_payment_intent_id' IS NOT NULL 
    THEN 'stripe'
  -- Si payment_method es 'card', inferir 'stripe'
  WHEN payment_method = 'card' 
    THEN 'stripe'
  -- Si payment_method es 'bank_transfer', inferir 'bank_transfer'
  WHEN payment_method = 'bank_transfer' 
    THEN 'bank_transfer'
  ELSE NULL
END
WHERE payment_provider IS NULL
  AND (
    metadata->>'payment_provider' IS NOT NULL
    OR metadata->>'stripe_payment_intent_id' IS NOT NULL
    OR payment_method IN ('card', 'bank_transfer')
  );

-- Actualizar payment_id desde metadata
UPDATE public.orders
SET payment_id = CASE
  -- Prioridad 1: metadata.payment_id
  WHEN metadata->>'payment_id' IS NOT NULL 
    THEN metadata->>'payment_id'
  -- Prioridad 2: metadata.stripe_payment_intent_id
  WHEN metadata->>'stripe_payment_intent_id' IS NOT NULL 
    THEN metadata->>'stripe_payment_intent_id'
  -- Prioridad 3: metadata.checkout_session_id (si existe)
  WHEN metadata->>'checkout_session_id' IS NOT NULL 
    THEN metadata->>'checkout_session_id'
  ELSE NULL
END
WHERE payment_id IS NULL
  AND (
    metadata->>'payment_id' IS NOT NULL
    OR metadata->>'stripe_payment_intent_id' IS NOT NULL
    OR metadata->>'checkout_session_id' IS NOT NULL
  );

-- Comentario para documentación
COMMENT ON COLUMN public.orders.payment_provider IS 
  'Proveedor de pago (stripe, bank_transfer, etc.). Prioridad: columna > metadata.';
COMMENT ON COLUMN public.orders.payment_id IS 
  'ID del pago en el proveedor (payment_intent_id, checkout_session_id, etc.). Prioridad: columna > metadata.';

