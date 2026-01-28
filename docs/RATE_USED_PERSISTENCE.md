# Documentación: Persistencia de rate_used.*_cents

## Problema Resuelto

Bug donde `metadata.shipping.rate_used.price_cents` y `carrier_cents` quedaban `NULL` en la base de datos aunque `metadata.shipping_pricing` tuviera números válidos.

## Regla de Negocio (Invariante)

**Si `metadata.shipping_pricing.total_cents` y/o `carrier_cents` son números válidos, entonces `metadata.shipping.rate_used.price_cents` y `carrier_cents` NUNCA deben quedar `NULL` o `missing`.**

## Cómo Verificar en SQL que rate_used no queda NULL

### Query de Verificación

```sql
-- Encontrar órdenes donde shipping_pricing tiene números pero rate_used tiene NULLs
SELECT
  id,
  created_at,
  (metadata->'shipping_pricing'->>'total_cents') as shipping_pricing_total_cents,
  (metadata->'shipping_pricing'->>'carrier_cents') as shipping_pricing_carrier_cents,
  (metadata->'shipping'->'rate_used'->>'price_cents') as rate_used_price_cents,
  (metadata->'shipping'->'rate_used'->>'carrier_cents') as rate_used_carrier_cents,
  (metadata->'shipping'->'_last_write'->>'route') as last_write_route
FROM public.orders
WHERE
  -- shipping_pricing tiene números
  (
    (metadata->'shipping_pricing'->>'total_cents') IS NOT NULL
    AND (metadata->'shipping_pricing'->>'total_cents') ~ '^\d+$'
    AND (metadata->'shipping_pricing'->>'total_cents')::numeric > 0
  )
  OR (
    (metadata->'shipping_pricing'->>'carrier_cents') IS NOT NULL
    AND (metadata->'shipping_pricing'->>'carrier_cents') ~ '^\d+$'
    AND (metadata->'shipping_pricing'->>'carrier_cents')::numeric > 0
  )
  -- Y rate_used tiene NULLs
  AND (
    (metadata->'shipping'->'rate_used'->>'price_cents') IS NULL
    OR (metadata->'shipping'->'rate_used'->>'carrier_cents') IS NULL
    OR (metadata->'shipping'->'rate_used') IS NULL
  )
ORDER BY created_at DESC
LIMIT 50;
```

### Interpretación

- **Si el query devuelve 0 filas**: ✅ Todo está correcto, no hay órdenes con el bug.
- **Si el query devuelve filas**: ⚠️ Hay órdenes afectadas. Revisar `last_write_route` para identificar qué endpoint las escribió.

## Cómo Correr el Backfill

### Paso 1: Verificar Cuántas Órdenes Serían Afectadas

```sql
-- Ejecutar el SELECT del script antes del UPDATE
-- Ver: ops/sql/backfill_rate_used_from_shipping_pricing.sql
```

### Paso 2: Ejecutar el Backfill

1. Abrir **Supabase SQL Editor**
2. Abrir el archivo: `ops/sql/backfill_rate_used_from_shipping_pricing.sql`
3. Copiar y pegar el script completo
4. **Ejecutar** (F5 o botón Run)
5. Revisar el resultado de `RETURNING` para verificar órdenes actualizadas

### Paso 3: Verificar Resultados

```sql
-- Después del backfill, ejecutar el query de verificación arriba
-- Debería devolver 0 filas (o menos filas que antes)
```

### Notas Importantes

- El script es **idempotente**: puede ejecutarse múltiples veces sin efectos secundarios
- Solo actualiza órdenes donde `shipping_pricing` tiene números pero `rate_used.*_cents` es NULL
- Preserva otros campos de `rate_used` (rate_id, provider, service, etc.)
- Agrega `_last_write.route = 'backfill-sql'` para tracking

## Cómo Correr el Hardening de RPC

### Cuándo Ejecutar

- **Después de deployar** cambios en código que usan RPCs
- **Como medida preventiva** antes de usar RPCs en producción
- **Si se detectan problemas** de persistencia vía RPC

### Pasos

1. Abrir **Supabase SQL Editor**
2. Abrir el archivo: `ops/sql/harden_rpc_shipping_metadata.sql`
3. Copiar y pegar el script completo
4. **Ejecutar** (F5 o botón Run)
5. Verificar que no hay errores

### Verificación Post-Ejecución

```sql
-- Verificar que las funciones existen y tienen los comentarios correctos
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('orders_set_shipping_label_creation', 'orders_patch_shipping_metadata')
ORDER BY proname;
```

### Qué Hace el Hardening

1. **Bloquea** `field_path = []` (patch completo de `{shipping}`)
2. **Bloquea** `field_path = ['rate_used']` (patch completo de `{shipping,rate_used}`)
3. **Preserva** `rate_used.*_cents` si `shipping_pricing` tiene números
4. Solo permite subpaths específicos como `['label_creation']`, `['tracking']`, etc.

## Endpoints que Usan Helpers

Todos estos endpoints pasan por `preserveRateUsed` + `ensureRateUsedInMetadata`:

- ✅ `apply-rate` - Con canary validation
- ✅ `requote` - Con canary validation
- ✅ `create-label`
- ✅ `sync-label`
- ✅ `cancel-label`
- ✅ `webhook-skydropx`
- ✅ `save-order`
- ✅ `set-shipping-package`
- ✅ `set-shipping-package-final`
- ✅ `update-shipping-override`
- ✅ `needs-address-review`

## Logging y Monitoreo

### Canary Validation

Los endpoints `apply-rate` y `requote` incluyen validación automática post-write:

- Si detectan discrepancia (shipping_pricing tiene números pero rate_used es NULL), loguean:
  - `[apply-rate] CRITICAL CANARY: shipping_pricing tiene números pero rate_used.*_cents es NULL/missing`
  - Incluye `orderId`, `shippingPricing`, `rateUsed`, y objetos completos para debugging

### Logs Estructurados

Todos los logs usan structured logging con `sanitizeForLog()` para prevenir log injection:
- `[apply-rate] FINAL_PAYLOAD`
- `[apply-rate] RAW_DB reread`
- `[apply-rate] DISCREPANCIA CRÍTICA`

## Troubleshooting

### Si rate_used sigue quedando NULL después de apply-rate

1. Revisar logs de `[apply-rate] RAW_DB reread` para ver valores reales de DB
2. Revisar logs de `[apply-rate] CANARY DETECTED BUG` si hay discrepancia
3. Verificar que `ensureRateUsedInMetadata` se ejecuta antes del `.update()`
4. Verificar que no hay otro writer ejecutándose después (race condition)

### Si el backfill no funciona

1. Verificar que `shipping_pricing.*_cents` tiene formato numérico válido (regex `^\d+$`)
2. Verificar que la condición WHERE es correcta
3. Ejecutar el SELECT primero para ver cuántas filas serían afectadas
