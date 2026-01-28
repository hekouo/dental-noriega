-- Hardening de funciones RPC para prevenir pisado de rate_used.*_cents
-- 
-- Este script actualiza las funciones RPC existentes con bloqueos adicionales:
-- 1. Bloquea patch de {shipping} completo (field_path vacío)
-- 2. Bloquea patch de {shipping,rate_used} completo
-- 3. Preserva rate_used.*_cents si shipping_pricing tiene números
--
-- CUÁNDO EJECUTAR:
-- - Después de deployar cambios en código que usan estas RPCs
-- - Como medida preventiva antes de usar RPCs en producción
-- - Si se detectan problemas de persistencia vía RPC
--
-- CÓMO EJECUTAR:
-- 1. Abrir Supabase SQL Editor
-- 2. Copiar y pegar este script completo
-- 3. Ejecutar (F5 o botón Run)
-- 4. Verificar que no hay errores
-- 5. (Opcional) Verificar funciones: SELECT proname FROM pg_proc WHERE proname LIKE 'orders_%shipping%';

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
    IF (shipping_pricing->>'total_cents') IS NOT NULL 
       AND (shipping_pricing->>'total_cents') ~ '^\d+$'
       AND (shipping_pricing->>'total_cents')::numeric > 0 THEN
      -- Verificar que rate_used sigue teniendo price_cents
      IF (updated_metadata->'shipping'->'rate_used'->>'price_cents') IS NULL 
         OR (updated_metadata->'shipping'->'rate_used'->>'price_cents') !~ '^\d+$' THEN
        -- Rellenar desde shipping_pricing si se perdió
        updated_metadata := jsonb_set(
          updated_metadata,
          '{shipping,rate_used}',
          COALESCE(updated_metadata->'shipping'->'rate_used', '{}'::jsonb) ||
          COALESCE(rate_used, '{}'::jsonb) ||
          jsonb_build_object(
            'price_cents', (shipping_pricing->>'total_cents')::numeric,
            'carrier_cents', COALES(
              CASE 
                WHEN (updated_metadata->'shipping'->'rate_used'->>'carrier_cents') ~ '^\d+$' 
                THEN (updated_metadata->'shipping'->'rate_used'->>'carrier_cents')::numeric
                ELSE NULL
              END,
              CASE 
                WHEN (rate_used->>'carrier_cents') ~ '^\d+$' 
                THEN (rate_used->>'carrier_cents')::numeric
                ELSE NULL
              END,
              CASE 
                WHEN (shipping_pricing->>'carrier_cents') ~ '^\d+$' 
                THEN (shipping_pricing->>'carrier_cents')::numeric
                ELSE NULL
              END,
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
BEGIN
  -- BLOQUEO 1: No permitir patch de {shipping} completo (field_path vacío)
  IF array_length(field_path, 1) IS NULL OR array_length(field_path, 1) = 0 THEN
    RAISE EXCEPTION 'orders_patch_shipping_metadata: field_path no puede estar vacío. Use subpaths específicos como [''label_creation''] o [''tracking'']';
  END IF;
  
  -- BLOQUEO 2: No permitir patch de {shipping,rate_used} completo
  IF field_path = ARRAY['rate_used'] THEN
    RAISE EXCEPTION 'orders_patch_shipping_metadata: No se permite patch de {shipping,rate_used} completo. Use subpaths específicos o actualice vía .update() con preserveRateUsed';
  END IF;
  
  -- Construir path completo: {shipping, field_path...}
  shipping_path := ARRAY['shipping'] || field_path;
  
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
    IF (shipping_pricing->>'total_cents') IS NOT NULL 
       AND (shipping_pricing->>'total_cents') ~ '^\d+$'
       AND (shipping_pricing->>'total_cents')::numeric > 0 THEN
      -- Verificar que rate_used sigue teniendo price_cents
      IF (updated_metadata->'shipping'->'rate_used'->>'price_cents') IS NULL 
         OR (updated_metadata->'shipping'->'rate_used'->>'price_cents') !~ '^\d+$' THEN
        -- Rellenar desde shipping_pricing si se perdió
        updated_metadata := jsonb_set(
          updated_metadata,
          '{shipping,rate_used}',
          COALESCE(updated_metadata->'shipping'->'rate_used', '{}'::jsonb) ||
          COALESCE(rate_used, '{}'::jsonb) ||
          jsonb_build_object(
            'price_cents', (shipping_pricing->>'total_cents')::numeric,
            'carrier_cents', COALES(
              CASE 
                WHEN (updated_metadata->'shipping'->'rate_used'->>'carrier_cents') ~ '^\d+$' 
                THEN (updated_metadata->'shipping'->'rate_used'->>'carrier_cents')::numeric
                ELSE NULL
              END,
              CASE 
                WHEN (rate_used->>'carrier_cents') ~ '^\d+$' 
                THEN (rate_used->>'carrier_cents')::numeric
                ELSE NULL
              END,
              CASE 
                WHEN (shipping_pricing->>'carrier_cents') ~ '^\d+$' 
                THEN (shipping_pricing->>'carrier_cents')::numeric
                ELSE NULL
              END,
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
