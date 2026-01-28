# Resumen: Hardening de rate_used.*_cents Persistence

## Cambios Implementados

### 1. Canary Validation ✅

**Archivo**: `src/lib/shipping/validateRateUsedPersistence.ts`

- Función `validateRateUsedPersistence()` que valida post-write si `rate_used.*_cents` persiste correctamente
- Detecta discrepancia: `shipping_pricing` tiene números pero `rate_used.*_cents` es NULL
- Log CRITICAL estructurado y sanitizado (previene log injection)
- Integrado en:
  - ✅ `apply-rate` - Validación después de RAW_DB reread
  - ✅ `requote` - Validación después de update con reread

### 2. Cobertura de Metadata Writers ✅

**Verificación**: Todos los endpoints que escriben `orders.metadata` usan helpers:

- ✅ `apply-rate` - preserveRateUsed + ensureRateUsedInMetadata + canary
- ✅ `requote` - preserveRateUsed + ensureRateUsedInMetadata + canary
- ✅ `create-label` - preserveRateUsed + ensureRateUsedInMetadata
- ✅ `sync-label` - preserveRateUsed + ensureRateUsedInMetadata
- ✅ `cancel-label` - preserveRateUsed + ensureRateUsedInMetadata
- ✅ `webhook-skydropx` - preserveRateUsed + ensureRateUsedInMetadata
- ✅ `save-order` - preserveRateUsed + ensureRateUsedInMetadata
- ✅ `set-shipping-package` - preserveRateUsed + ensureRateUsedInMetadata
- ✅ `set-shipping-package-final` - preserveRateUsed + ensureRateUsedInMetadata
- ✅ `update-shipping-override` - preserveRateUsed + ensureRateUsedInMetadata
- ✅ `needs-address-review` - preserveRateUsed + ensureRateUsedInMetadata

**Resultado**: 100% de cobertura. No hay endpoints que escriban metadata sin usar los helpers.

### 3. RPC Hardening ✅

**Archivo**: `ops/sql/harden_rpc_shipping_metadata.sql`

**Bloqueos implementados**:
- ❌ `field_path = []` → EXCEPTION (no permite patch completo de `{shipping}`)
- ❌ `field_path = ['rate_used']` → EXCEPTION (no permite patch completo de `{shipping,rate_used}`)

**Guardrails**:
- Si `shipping_pricing.total_cents` es numérico válido (regex `^\d+$`), preserva/rellena `rate_used.*_cents`
- Usa validación regex para asegurar que valores son numéricos antes de usar

**Cuándo ejecutar**:
- Después de deployar cambios que usan RPCs
- Como medida preventiva antes de usar RPCs en producción
- Si se detectan problemas de persistencia vía RPC

### 4. Backfill Script ✅

**Archivo**: `ops/sql/backfill_rate_used_from_shipping_pricing.sql`

**Características**:
- Idempotente (puede ejecutarse múltiples veces)
- Filtros seguros con regex `^\d+$` para validar números
- Preserva otros campos de `rate_used` (rate_id, provider, service, etc.)
- Incluye `RETURNING` para verificación
- Agrega `_last_write.route = 'backfill-sql'` para tracking

**Cuándo ejecutar**:
- Después de mergear el PR que corrige el bug
- Para corregir órdenes históricas afectadas
- Puede ejecutarse múltiples veces sin efectos secundarios

### 5. Documentación ✅

**Archivo**: `docs/RATE_USED_PERSISTENCE.md`

**Contenido**:
- Cómo verificar en SQL que `rate_used` no queda NULL
- Cómo correr el backfill (pasos detallados)
- Cómo correr el hardening de RPC (cuándo y cómo)
- Troubleshooting guide
- Lista de endpoints que usan helpers

## Validaciones

✅ `pnpm typecheck` - PASS (0 errores TypeScript)
✅ `pnpm lint` - PASS (0 errores, solo warnings)
✅ `pnpm test` - PASS (16 tests pasan)
✅ `pnpm build` - PASS (compilación exitosa)

## Próximos Pasos

1. **Mergear PR** a `main`
2. **Ejecutar backfill** (opcional, para corregir órdenes históricas):
   - Abrir `ops/sql/backfill_rate_used_from_shipping_pricing.sql` en Supabase SQL Editor
   - Ejecutar SELECT primero para ver cuántas órdenes serían afectadas
   - Ejecutar UPDATE si es necesario
3. **Ejecutar RPC hardening** (preventivo):
   - Abrir `ops/sql/harden_rpc_shipping_metadata.sql` en Supabase SQL Editor
   - Ejecutar script completo
   - Verificar que no hay errores
4. **Monitorear logs**:
   - Buscar `[apply-rate] CRITICAL CANARY` o `[requote] CRITICAL CANARY` en logs de producción
   - Si aparecen, investigar qué endpoint está causando el problema

## Archivos Creados/Modificados

**Nuevos**:
- `src/lib/shipping/validateRateUsedPersistence.ts`
- `ops/sql/harden_rpc_shipping_metadata.sql`
- `ops/sql/backfill_rate_used_from_shipping_pricing.sql`
- `docs/RATE_USED_PERSISTENCE.md`
- `RATE_USED_HARDENING_SUMMARY.md`

**Modificados**:
- `src/app/api/admin/shipping/skydropx/apply-rate/route.ts` - Agregada canary validation
- `src/app/api/admin/shipping/skydropx/requote/route.ts` - Agregada canary validation
