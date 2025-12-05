-- Migration: Agregar columna last_notified_shipping_status a orders
-- Esta columna se usa para evitar enviar notificaciones duplicadas cuando cambia el shipping_status
-- Es opcional: si no existe, el sistema funcionará pero puede enviar notificaciones duplicadas

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS last_notified_shipping_status TEXT;

COMMENT ON COLUMN public.orders.last_notified_shipping_status IS 
'Último estado de envío para el cual se envió una notificación por correo. Se usa para evitar notificaciones duplicadas.';
