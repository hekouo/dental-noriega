-- Versión endurecida de las funciones RPC para prevenir pisado de rate_used.*_cents
-- Reemplaza patch_shipping_label_creation.sql con guardrails adicionales

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
  shipping_pricing jsonb;
  rate_used jsonb;
BEGIN
  -- Obtener metadata actual
  SELECT metadata INTO current_metadata
  FROM public.orders
  WHERE id = order_id;
  
  IF current_metadata IS NULL THEN
    current_metadata := '{}'::jsonb;
  END IF;
  
  -- Extraer shipping_pricing y rate_used para guardrail
  shipping_pricing := current_metadata->'shipping_pricing';
  rate_used := current_metadata->'shipping'->'rate_used';
  
  -- Hacer PATCH atómico: solo actualizar metadata.shipping.label_creation
  -- Preserva todo lo demás (rate_used, pricing, etc.)
  updated_metadata := jsonb_set(
    current_metadata,
    '{shipping,label_creation}',
    label_creation,
    true -- create_missing = true para crear shipping si no existe
  );
  
  -- GUARDRAIL: Verificar que rate_used no se haya perdido
  -- Si shipping_pricing tiene números, rate_used DEBE tener números
  IF shipping_pricing IS NOT NULL THEN
    IF (shipping_pricing->>'total_cents')::numeric IS NOT NULL THEN
      -- Verificar que rate_used sigue teniendo price_cents
      IF (updated_metadata->'shipping'->'rate_used'->>'price_cents') IS NULL THEN
        -- Rellenar desde shipping_pricing si se perdió
        updated_metadata := jsonb_set(
          updated_metadata,
          '{shipping,rate_used}',
          COALESCE(updated_metadata->'shipping'->'rate_used', '{}'::jsonb) ||
          jsonb_build_object(
            'price_cents', (shipping_pricing->>'total_cents')::numeric,
            'carrier_cents', COALES(
              (updated_metadata->'shipping'->'rate_used'->>'carrier_cents')::numeric,
              (shipping_pricing->>'carrier_cents')::numeric,
              (shipping_pricing->>'total_cents')::numeric
            )
          ),
          true
        );
      END IF;
    END IF;
  END IF;
  
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
-- ENDURECIDA: Bloquea patch de {shipping} completo y {shipping,rate_used} completo
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
  shipping_pricing jsonb;
  rate_used jsonb;
  path_str text;
BEGIN
  -- BLOQUEO 1: No permitir patch de {shipping} completo (field_path vacío)
  IF array_length(field_path, 1) IS NULL OR array_length(field_path, 1) = 0 THEN
    RAISE EXCEPTION 'orders_patch_shipping_metadata: field_path no puede estar vacío. Use subpaths específicos como [''label_creation''] o [''tracking'']';
  END IF;
  
  -- BLOQUEO 2: No permitir patch de {shipping,rate_used} completo
  -- Solo permitir subpaths de rate_used si es necesario (pero mejor evitarlo)
  IF field_path = ARRAY['rate_used'] THEN
    RAISE EXCEPTION 'orders_patch_shipping_metadata: No se permite patch de {shipping,rate_used} completo. Use subpaths específicos o actualice vía .update() con preserveRateUsed';
  END IF;
  
  -- Construir path completo: {shipping, field_path...}
  shipping_path := ARRAY['shipping'] || field_path;
  path_str := array_to_string(shipping_path, ',');
  
  -- Obtener metadata actual
  SELECT metadata INTO current_metadata
  FROM public.orders
  WHERE id = order_id;
  
  IF current_metadata IS NULL THEN
    current_metadata := '{}'::jsonb;
  END IF;
  
  -- Extraer shipping_pricing y rate_used para guardrail
  shipping_pricing := current_metadata->'shipping_pricing';
  rate_used := current_metadata->'shipping'->'rate_used';
  
  -- Hacer PATCH atómico
  updated_metadata := jsonb_set(
    current_metadata,
    shipping_path,
    field_value,
    true -- create_missing = true
  );
  
  -- GUARDRAIL: Verificar que rate_used no se haya perdido
  -- Si shipping_pricing tiene números, rate_used DEBE tener números
  IF shipping_pricing IS NOT NULL THEN
    IF (shipping_pricing->>'total_cents')::numeric IS NOT NULL THEN
      -- Verificar que rate_used sigue teniendo price_cents
      IF (updated_metadata->'shipping'->'rate_used'->>'price_cents') IS NULL THEN
        -- Rellenar desde shipping_pricing si se perdió
        updated_metadata := jsonb_set(
          updated_metadata,
          '{shipping,rate_used}',
          COALESCE(updated_metadata->'shipping'->'rate_used', '{}'::jsonb) ||
          COALESCE(rate_used, '{}'::jsonb) ||
          jsonb_build_object(
            'price_cents', (shipping_pricing->>'total_cents')::numeric,
            'carrier_cents', COALES(
              (updated_metadata->'shipping'->'rate_used'->>'carrier_cents')::numeric,
              (rate_used->>'carrier_cents')::numeric,
              (shipping_pricing->>'carrier_cents')::numeric,
              (shipping_pricing->>'total_cents')::numeric
            )
          ),
          true
        );
      END IF;
    END IF;
  END IF;
  
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
  'Actualiza SOLO metadata.shipping.label_creation sin tocar rate_used u otros campos de shipping. Incluye guardrail para preservar rate_used.*_cents si shipping_pricing tiene números.';

COMMENT ON FUNCTION public.orders_patch_shipping_metadata IS 
  'Función genérica para hacer PATCH atómico de subcampos en metadata.shipping. BLOQUEA patch de {shipping} completo y {shipping,rate_used} completo. Solo permite subpaths específicos como [''label_creation''], [''tracking''], etc. Incluye guardrail para preservar rate_used.*_cents.';
