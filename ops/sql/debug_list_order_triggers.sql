-- Debug: Listar triggers y funciones que pueden modificar orders.metadata
-- Ejecutar en Supabase SQL Editor para identificar "writers silenciosos"

-- 1. Listar todos los triggers en la tabla orders
SELECT
  tgname AS trigger_name,
  tgtype::text AS trigger_type,
  tgenabled AS is_enabled,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.orders'::regclass
  AND tgisinternal = false
ORDER BY tgname;

-- 2. Buscar funciones que mencionen rate_used o shipping_pricing
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid) ILIKE '%rate_used%'
    OR pg_get_functiondef(p.oid) ILIKE '%shipping_pricing%'
    OR pg_get_functiondef(p.oid) ILIKE '%metadata%'
  )
ORDER BY p.proname;

-- 3. Buscar funciones que actualicen orders
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid) ILIKE '%UPDATE%orders%'
    OR pg_get_functiondef(p.oid) ILIKE '%update%orders%'
  )
ORDER BY p.proname;

-- 4. Listar todas las funciones en el schema public (para referencia)
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 5. Verificar si hay RLS (Row Level Security) policies que puedan afectar updates
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;
