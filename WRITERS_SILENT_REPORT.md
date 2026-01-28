# Reporte: Writers Silenciosos (endpoints que escriben orders sin helpers)

## Endpoints que SÍ usan helpers (normalizeShippingMetadata/metadataWriterLogger)

✅ **Asegurados (usan preserveRateUsed + ensureRateUsedInMetadata):**
- `src/app/api/admin/shipping/skydropx/apply-rate/route.ts`
- `src/app/api/admin/shipping/skydropx/create-label/route.ts` (update principal)
- `src/app/api/admin/shipping/skydropx/sync-label/route.ts`
- `src/app/api/admin/shipping/skydropx/requote/route.ts`
- `src/app/api/admin/shipping/skydropx/cancel-label/route.ts`
- `src/app/api/shipping/skydropx/webhook/route.ts`
- `src/app/api/checkout/save-order/route.ts`
- `src/app/api/admin/orders/set-shipping-package/route.ts`
- `src/app/api/admin/orders/set-shipping-package-final/route.ts`
- `src/app/api/admin/orders/update-shipping-override/route.ts`
- `src/app/api/admin/orders/needs-address-review/route.ts`

## Endpoints SOSPECHOSOS (actualizan orders pero NO metadata o sin helpers)

⚠️ **create-label tiene 2 updates tempranos (solo columnas, no metadata):**
- Línea 397: `await supabase.from("orders").update(updateData).eq("id", orderId);`
  - Solo actualiza: `shipping_tracking_number`, `shipping_label_url`, `shipping_status`
  - NO toca metadata ✅
- Línea 1756: `await supabase.from("orders").update(earlyUpdateData).eq("id", orderId);`
  - Solo actualiza: `shipping_shipment_id`, `shipping_rate_ext_id`, `updated_at`
  - NO toca metadata ✅

⚠️ **updateOrderShippingAndNotes (server action):**
- `src/lib/actions/orders.admin.ts:122`
- Actualiza: `admin_notes`, `shipping_status`, `shipping_tracking_number`, `shipping_label_url`
- NO toca metadata ✅

## Endpoints que crean orders (verificar si inicializan metadata correctamente)

- `src/app/api/checkout/create-order/route.ts` - Crear orden nueva
  - Verificar si inicializa `metadata.shipping.rate_used` correctamente

## Recomendaciones

1. **Verificar create-order**: Asegurar que si crea orden con shipping_pricing, también inicializa rate_used
2. **Monitorear RAW_DB reread**: Los logs de apply-rate mostrarán si hay discrepancia
3. **Ejecutar SQL debug**: `ops/sql/debug_list_order_triggers.sql` para identificar triggers/funciones DB
4. **Endurecer más**: El guardrail en `ensureRateUsedInMetadata` ahora detecta y previene nulls
