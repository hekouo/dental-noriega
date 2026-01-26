-- Función RPC para hacer PATCH atómico de metadata.shipping.label_creation
-- sin reemplazar metadata.shipping completo (preserva rate_used y otros campos)

CREATE OR REPLACE FUNCTION public.orders_set_shipping_label_creation(
  order_id uuid,
  label_creation jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_metadata jsonb;
  updated_metadata jsonb;
BEGIN
  -- Obtener metadata actual
  SELECT metadata INTO current_metadata
  FROM public.orders
  WHERE id = order_id;
  
  IF current_metadata IS NULL THEN
    current_metadata := '{}'::jsonb;
  END IF;
  
  -- Hacer PATCH atómico: solo actualizar metadata.shipping.label_creation
  -- Preserva todo lo demás (rate_used, pricing, etc.)
  updated_metadata := jsonb_set(
    current_metadata,
    '{shipping,label_creation}',
    label_creation,
    true -- create_missing = true para crear shipping si no existe
  );
  
  -- Actualizar solo metadata (no otras columnas)
  UPDATE public.orders
  SET metadata = updated_metadata,
      updated_at = NOW()
  WHERE id = order_id;
  
  -- Retornar metadata actualizado para verificación
  RETURN updated_metadata;
END;
$$;

-- Función genérica para PATCH de cualquier campo en metadata.shipping
CREATE OR REPLACE FUNCTION public.orders_patch_shipping_metadata(
  order_id uuid,
  field_path text[], -- ej: ['label_creation'] o ['tracking_number']
  field_value jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_metadata jsonb;
  updated_metadata jsonb;
  shipping_path text[];
BEGIN
  -- Construir path completo: {shipping, field_path...}
  shipping_path := ARRAY['shipping'] || field_path;
  
  -- Obtener metadata actual
  SELECT metadata INTO current_metadata
  FROM public.orders
  WHERE id = order_id;
  
  IF current_metadata IS NULL THEN
    current_metadata := '{}'::jsonb;
  END IF;
  
  -- Hacer PATCH atómico
  updated_metadata := jsonb_set(
    current_metadata,
    shipping_path,
    field_value,
    true -- create_missing = true
  );
  
  -- Actualizar solo metadata
  UPDATE public.orders
  SET metadata = updated_metadata,
      updated_at = NOW()
  WHERE id = order_id;
  
  -- Retornar metadata actualizado
  RETURN updated_metadata;
END;
$$;

-- Comentarios para documentación
COMMENT ON FUNCTION public.orders_set_shipping_label_creation IS 
  'Actualiza SOLO metadata.shipping.label_creation sin tocar rate_used u otros campos de shipping';

COMMENT ON FUNCTION public.orders_patch_shipping_metadata IS 
  'Función genérica para hacer PATCH atómico de cualquier campo en metadata.shipping sin reemplazar shipping completo';
