# Shipping Metadata Triggers Audit

## Objetivo

Verificar si existen triggers en `public.orders` que puedan estar reescribiendo `metadata.shipping.rate_used` después de un UPDATE, causando que los valores numéricos se vuelvan `null` a pesar de que el servidor los envió correctamente.

## Query para Listar Triggers

Ejecutar en Supabase SQL Editor o psql:

```sql
-- Listar todos los triggers en la tabla orders
SELECT 
    tgname AS trigger_name,
    tgtype::text AS trigger_type,
    tgenabled AS is_enabled,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.orders'::regclass
    AND tgisinternal = false  -- Solo triggers definidos por usuario, no internos
ORDER BY tgname;
```

## Query para Ver Funciones Asociadas

Si hay triggers, ver las funciones que ejecutan:

```sql
-- Ver funciones asociadas a triggers de orders
SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.orders'::regclass
    AND t.tgisinternal = false
ORDER BY t.tgname;
```

## Qué Buscar

1. **Triggers que modifiquen `metadata`**: Buscar en `trigger_definition` o `function_definition` referencias a:
   - `NEW.metadata`
   - `metadata.shipping`
   - `metadata.shipping.rate_used`
   - Cualquier UPDATE o SET sobre metadata

2. **Triggers BEFORE UPDATE**: Estos pueden modificar `NEW.metadata` antes de que se persista.

3. **Triggers AFTER UPDATE**: Estos no deberían afectar el UPDATE actual, pero podrían hacer un UPDATE adicional.

## Si Se Encuentra un Trigger Problemático

1. **Deshabilitar temporalmente** (solo para testing):
   ```sql
   ALTER TABLE public.orders DISABLE TRIGGER nombre_del_trigger;
   ```

2. **Revisar la función** y modificar para que NO reescriba `metadata.shipping.rate_used` si ya tiene valores numéricos.

3. **Alternativa**: Modificar el trigger para que también aplique el overwrite de `rate_used` desde `shipping_pricing` (similar a lo que hace `normalizeShippingMetadata`).

## Ejemplo de Trigger Problemático

```sql
-- Ejemplo de trigger que podría causar el bug:
CREATE OR REPLACE FUNCTION reset_rate_used()
RETURNS TRIGGER AS $$
BEGIN
    -- Esto reescribiría rate_used con nulls
    NEW.metadata := jsonb_set(
        NEW.metadata,
        '{shipping,rate_used}',
        '{"price_cents": null, "carrier_cents": null}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_update_orders
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION reset_rate_used();
```

## Notas

- Los triggers internos de Postgres (p. ej., para constraints) no deberían afectar.
- Si no hay triggers, el problema está en el código del servidor (ver logs PRE-WRITE vs POST-WRITE).
- Los logs de `apply-rate` mostrarán si hay mismatch entre PRE-WRITE y POST-WRITE.
