## 🎯 Objetivo

Mejorar el Admin de Pedidos para usar y mostrar las columnas reales de `public.orders` (shipping_* y payment_*) en lugar de solo metadata, y agregar visualización de `variant_detail` en los items del pedido.

## 📋 Cambios realizados

### 1. Actualización de tipos y queries
- ✅ Actualizado `OrderItem` type para incluir `variant_detail: Record<string, unknown> | null`
- ✅ Actualizadas queries en `getOrderWithItemsAdmin` y `getOrderWithItems` para incluir `variant_detail` en el select
- ✅ Mapeo de `variant_detail` en los items retornados

### 2. Mejoras en lista de pedidos (`/admin/pedidos`)
- ✅ Mejorada visualización de envío: muestra `shipping_tracking_number` cuando existe
- ✅ Mejorado manejo de `shipping_provider === null` para mostrar "Recoger en tienda"
- ✅ La tabla ya mostraba `payment_method`, `payment_status`, `shipping_status` correctamente

### 3. Mejoras en detalle de pedido (`/admin/pedidos/[id]`)
- ✅ **Sección "Pago"** mejorada:
  - Muestra `payment_method` y `payment_status`
  - Agrega `payment_provider` y `payment_id` (desde metadata) si existen
- ✅ **Sección "Envío"** mejorada:
  - Ya mostraba `shipping_status`, `shipping_provider`, `shipping_service_name`
  - Ya mostraba `shipping_price_cents`, `shipping_eta_min_days/max_days`
  - Ya mostraba `shipping_tracking_number` y `shipping_label_url`
- ✅ **Sección "Notas internas"**:
  - Muestra `admin_notes` si existe (solo lectura)
  - Incluye componente `AdminNotesClient` para editar
- ✅ **Items del pedido**:
  - Muestra `variant_detail` cuando existe
  - Usa `variantDetailFromJSON` para formatear colores (ej: "Color: Azul · Preferencia: 2 azules y 1 rojo")
  - Fallback a formato simple key:value para JSON desconocido

### 4. Badge VERCEL_ENV
- ✅ Agregado badge discreto en el header global (`layout.tsx`)
- ✅ Muestra "PROD" (verde) si `VERCEL_ENV === "production"`
- ✅ Muestra "PREVIEW" (ámbar) si `VERCEL_ENV === "preview"`
- ✅ Muestra "LOCAL" (gris) si está definido pero no es production/preview
- ✅ Se oculta si `VERCEL_ENV` no está definido

## ✅ Validaciones

- ✅ `pnpm typecheck` - Sin errores
- ✅ `pnpm build` - Compilación exitosa
- ✅ `pnpm lint` - Solo warnings preexistentes (no relacionados con estos cambios)

## 🧪 Testing

- [ ] Verificar que en producción el Admin lista muestre pago/envío con datos reales cuando existan
- [ ] Verificar que en detalle aparezcan secciones Pago y Envío con columnas shipping_* y payment_*
- [ ] Verificar que `variant_detail` aparezca en items cuando existe (y no rompa cuando es NULL)
- [ ] Verificar que se vea badge PREVIEW/PROD para no confundir dominio preview vs prod

## 📝 Notas

- No se cambió lógica de negocio, solo visualización/lectura
- Los tipos TypeScript están actualizados
- Compatible con SSR (no rompe server components)
- Reutiliza helpers existentes (`formatMXNFromCents`, `variantDetailFromJSON`, etc.)
