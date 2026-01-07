-- Script opcional para marcar órdenes abandonadas
-- Ejecutar manualmente o como job/cron
-- NO bloqueante: solo actualiza status, no borra datos

-- Marcar órdenes con payment_status='pending' y más de 24 horas como 'abandoned'
-- Solo actualiza si el status actual es 'pending' (idempotente)

UPDATE public.orders
SET 
  status = 'abandoned',
  updated_at = now()
WHERE 
  payment_status = 'pending'
  AND status = 'pending'
  AND created_at < now() - interval '24 hours';

-- Opcional: Log de cuántas órdenes se marcaron
-- SELECT COUNT(*) as abandoned_count
-- FROM public.orders
-- WHERE status = 'abandoned' AND payment_status = 'pending';

