-- Migration: Agregar columna last_notified_shipping_status a orders
-- Esta columna se usa para idempotencia en notificaciones de envío
-- Solo se actualiza cuando se envía exitosamente un correo de notificación

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS last_notified_shipping_status TEXT;

COMMENT ON COLUMN public.orders.last_notified_shipping_status IS 
'Último estado de envío para el cual se envió una notificación por correo. Se usa para evitar enviar múltiples correos para el mismo estado.';

