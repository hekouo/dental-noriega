# Reporte: Writers Silenciosos vía RPC

## Funciones RPC Definidas en SQL

### 1. `orders_set_shipping_label_creation`
- **Archivo SQL**: `ops/sql/patch_shipping_label_creation.sql` (líneas 4-43)
- **Path actualizado**: `{shipping,label_creation}` (seguro, solo subcampo)
- **Riesgo**: ✅ BAJO - Solo actualiza `label_creation`, preserva `rate_used`
- **Uso actual**: ❌ NO se usa en código TypeScript

### 2. `orders_patch_shipping_metadata`
- **Archivo SQL**: `ops/sql/patch_shipping_label_creation.sql` (líneas 46-89)
- **Path actualizado**: `{shipping, field_path...}` (genérico, puede ser peligroso)
- **Riesgo**: ⚠️ ALTO si se usa con `field_path = []` o `['rate_used']` completo
- **Uso actual**: ❌ NO se usa en código TypeScript

## Análisis de Riesgo

### `orders_patch_shipping_metadata` - Riesgos Potenciales

**Escenario Peligroso 1: Patch de `{shipping}` completo**
```typescript
// PELIGROSO: Esto reemplazaría todo shipping, incluyendo rate_used
supabase.rpc('orders_patch_shipping_metadata', {
  order_id: orderId,
  field_path: [], // Path vacío = {shipping}
  field_value: { label_creation: {...} } // Objeto parcial sin rate_used
});
```

**Escenario Peligroso 2: Patch de `{shipping,rate_used}` completo**
```typescript
// PELIGROSO: Si field_value no incluye price_cents/carrier_cents
supabase.rpc('orders_patch_shipping_metadata', {
  order_id: orderId,
  field_path: ['rate_used'],
  field_value: { 
    rate_id: 'new-id',
    // FALTA: price_cents, carrier_cents -> se perderían o quedarían null
  }
});
```

**Escenario Seguro: Patch de subcampos específicos**
```typescript
// SEGURO: Solo actualiza label_creation
supabase.rpc('orders_patch_shipping_metadata', {
  order_id: orderId,
  field_path: ['label_creation'],
  field_value: { status: 'created', ... }
});
```

## Llamadas RPC Encontradas en Código

**Resultado**: ❌ **CERO llamadas encontradas**

- No se encontraron llamadas a `.rpc()` en `src/`
- No se encontraron referencias a `orders_set_shipping_label_creation`
- No se encontraron referencias a `orders_patch_shipping_metadata`

**Conclusión**: Las funciones RPC existen en SQL pero **no se están usando actualmente**. Sin embargo, representan un riesgo futuro si se usan incorrectamente.

## Recomendaciones de Fix

### 1. Endurecer `orders_patch_shipping_metadata` en SQL
- **Bloquear** `field_path = []` (no permitir patch de `{shipping}` completo)
- **Bloquear** `field_path = ['rate_used']` (no permitir patch de `rate_used` completo)
- **Permitir solo** subpaths específicos: `['label_creation']`, `['tracking']`, `['address']`, etc.

### 2. Agregar Guardrail en SQL
- Antes de actualizar, verificar si `shipping_pricing` tiene números
- Si `shipping_pricing.total_cents` es number, asegurar que `rate_used.price_cents` no quede null
- Si el patch resultaría en `rate_used.*_cents = null` cuando hay canonical pricing, rechazar o rellenar

### 3. Crear Helper TypeScript Seguro
- Wrapper que valida paths antes de llamar RPC
- Aplica `ensureRateUsedInMetadata` antes de construir `field_value`
- Logging detallado de todas las llamadas RPC

### 4. Documentación y Tests
- Documentar paths permitidos
- Agregar tests que verifiquen que RPCs no pueden pisar `rate_used.*_cents`
