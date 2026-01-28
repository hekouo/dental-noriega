# Reporte: Debugging de rate_used.*_cents NULL

## Cambios Implementados

### 1. Logging Detallado ✅

#### FINAL_METADATA_TO_DB (antes de .update())
**Ubicación**: `src/app/api/admin/shipping/skydropx/apply-rate/route.ts` línea ~348

**Qué loguea**:
- Objeto EXACTO que se pasa a `.update()` (misma variable `finalMetadataForDb`)
- `rate_used.price_cents`, `rate_used.carrier_cents`, `rate_used.customer_total_cents`
- `shipping_pricing.total_cents`, `shipping_pricing.carrier_cents`
- `Object.keys(rate_used)` para ver si llega incompleto
- Objeto completo `rate_used` para debugging

**Propósito**: Identificar si el payload que se construye tiene los valores correctos antes de escribir a DB.

#### DB_VERIFICATION (después de .update())
**Ubicación**: `src/app/api/admin/shipping/skydropx/apply-rate/route.ts` línea ~420

**Qué loguea**:
- Valores desde DB usando paths JSONB (simulando SQL):
  - `db.metadata #>> '{shipping,rate_used,price_cents}'`
  - `db.metadata #>> '{shipping,rate_used,carrier_cents}'`
  - `db.metadata #>> '{shipping_pricing,total_cents}'`
  - `db.metadata #>> '{shipping_pricing,carrier_cents}'`
- Comparación `beforeUpdateHadNumbers` vs `afterUpdateHasNumbers`
- Flag `discrepancy` si payload tenía números pero DB no

**Propósito**: Detectar si el problema es:
- **Hipótesis A**: Payload incorrecto (antes del update ya venía null)
- **Hipótesis B**: Otro writer posterior (antes del update tenía números, después está null)

### 2. Helper mergeRateUsedPreserveCents ✅

**Archivo**: `src/lib/shipping/mergeRateUsedPreserveCents.ts`

**Reglas de merge**:
1. `price_cents := incoming.price_cents ?? existing.price_cents ?? shipping_pricing.total_cents`
2. `carrier_cents := incoming.carrier_cents ?? existing.carrier_cents ?? shipping_pricing.carrier_cents`
3. Preserva todos los demás campos de `rate_used` (rate_id, provider, service, etc.)

**Aplicación**: Se ejecuta JUSTO antes de persistir en `apply-rate`, después de `ensureRateUsedInMetadata`.

### 3. Guardrail Final ✅

**Ubicación**: `src/app/api/admin/shipping/skydropx/apply-rate/route.ts` línea ~365

**Lógica**:
- Si `shipping_pricing` tiene números Y `rate_used.*_cents` sigue null después de `mergeRateUsedPreserveCents`
- → Aborta write con error 500
- → Log CRITICAL con contexto completo

**Propósito**: Prevenir escribir datos inconsistentes a DB.

### 4. Búsqueda de Writers Silenciosos 🔍

**Patrones buscados**:
- `shipping.rate_used =`
- `rate_used = {`
- `jsonb_set(.*shipping.*rate_used`
- `rate_used_overwritten`
- `canonical_detected`

**Hallazgos**:
- `normalizeShippingMetadata.ts` línea 156: Construye `rate_used` desde canonical pricing
- `normalizeShippingMetadata.ts` línea 203: Overwrite final desde canonical RAW pricing
- `preserveRateUsed()`: Ya tiene lógica para preservar, pero puede tener edge cases

**Siguiente paso**: Revisar si hay otros endpoints que llamen a `normalizeShippingMetadata` o `preserveRateUsed` y luego hagan merge incorrecto.

## Cómo Usar los Logs para Debugging

### Escenario 1: Payload Incorrecto (Hipótesis A)
**Síntoma**: `FINAL_METADATA_TO_DB` muestra `rate_used.price_cents = null`
**Causa**: El constructor del payload está perdiendo los valores antes del update
**Fix**: Revisar `normalizeShippingMetadata`, `preserveRateUsed`, `mergeRateUsedPreserveCents`

### Escenario 2: Otro Writer Posterior (Hipótesis B)
**Síntoma**: 
- `FINAL_METADATA_TO_DB` muestra `rate_used.price_cents = 19353` (números)
- `DB_VERIFICATION` muestra `db.metadata #>> '{shipping,rate_used,price_cents}' = null`
- `discrepancy = true`
**Causa**: Otro endpoint/trigger/webhook está pisando `shipping.rate_used` después de apply-rate
**Fix**: Buscar otros writers que no setean `_last_write` o que hacen merge incorrecto

### Escenario 3: Guardrail Activa
**Síntoma**: Error 500 con mensaje "GUARDRAIL FINAL: Abortando write"
**Causa**: `mergeRateUsedPreserveCents` no está funcionando correctamente
**Fix**: Revisar lógica de merge y asegurar que canonical pricing está disponible

## Validaciones Ejecutadas

✅ `pnpm typecheck` - PASS (0 errores TypeScript)
✅ `pnpm lint` - PASS (0 errores)
✅ `pnpm build` - PASS (compilación exitosa)
✅ `pnpm test` - PASS (16 tests pasan)

## Próximos Pasos

1. **Deploy a staging/preview** y monitorear logs:
   - Buscar `[apply-rate] FINAL_METADATA_TO_DB`
   - Buscar `[apply-rate] DB_VERIFICATION`
   - Buscar `[apply-rate] GUARDRAIL FINAL`

2. **Si se detecta discrepancia**:
   - Revisar otros endpoints que escriben metadata (create-label, sync-label, webhook)
   - Verificar triggers SQL en Supabase
   - Buscar webhooks de Skydropx que puedan estar pisando

3. **Si guardrail activa**:
   - Revisar `mergeRateUsedPreserveCents` y asegurar que canonical pricing está disponible
   - Verificar que `ensureRateUsedInMetadata` está funcionando correctamente

## Archivos Modificados

- `src/app/api/admin/shipping/skydropx/apply-rate/route.ts` - Logging detallado + mergeRateUsedPreserveCents + guardrail
- `src/lib/shipping/mergeRateUsedPreserveCents.ts` - Nuevo helper para merge seguro
- `RATE_USED_DEBUGGING_REPORT.md` - Este reporte
