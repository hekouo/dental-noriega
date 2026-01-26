-- Query para listar todos los triggers en la tabla public.orders
-- Ejecutar en Supabase SQL Editor para verificar si hay triggers que puedan reescribir metadata

SELECT
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS trigger_definition,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition,
  t.tgenabled AS is_enabled,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS trigger_timing,
  CASE t.tgtype::integer & 28
    WHEN 16 THEN 'UPDATE'
    WHEN 8 THEN 'DELETE'
    WHEN 4 THEN 'INSERT'
    ELSE 'UNKNOWN'
  END AS trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
  AND c.relname = 'orders'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Si hay triggers, revisar especialmente si alguno modifica NEW.metadata o NEW.metadata.shipping.rate_used
-- Un trigger problemático podría verse así:
-- CREATE TRIGGER ... BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION ...
-- Y dentro de la función, algo como: NEW.metadata = jsonb_set(NEW.metadata, '{shipping,rate_used}', '{"price_cents": null}'::jsonb);
