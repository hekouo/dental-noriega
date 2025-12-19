-- Agregar columna variant_detail (JSONB) a order_items para guardar detalles de variantes (colores, etc.)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_detail JSONB;

-- Comentario para documentación
COMMENT ON COLUMN public.order_items.variant_detail IS 
  'Detalles de variantes del producto (ej: {"color": "Azul"} o {"color": "Surtido", "notes": "2 azules y 1 rojo"})';

