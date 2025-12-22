<<<<<<< HEAD
## 🎯 Objetivo
=======
<<<<<<< HEAD
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
=======
## Objetivo
>>>>>>> origin/main

Estandarizar el uso de `payment_provider` y `payment_id` en las columnas reales de `public.orders`, en lugar de depender solo de `metadata`. Esto mejora la consistencia y facilita consultas directas.

## 📋 Cambios realizados

### 1. Persistencia en flujos de pago

#### Flujo CARD (Stripe)
- ✅ **Webhook Stripe** (`/api/stripe/webhook`):
  - Al confirmar pago (`payment_intent.succeeded`): establece `payment_provider='stripe'`, `payment_id=<payment_intent_id>`, `payment_method='card'`, `payment_status='paid'`
  - Al fallar pago (`payment_intent.payment_failed`): establece `payment_provider='stripe'`, `payment_id=<payment_intent_id>`, `payment_status='failed'`
  - Al reembolsar (`charge.refunded`): establece `payment_provider='stripe'`, `payment_id=<payment_intent_id>`, `payment_status='refunded'`
- ✅ **create-payment-intent** (`/api/stripe/create-payment-intent`):
  - Establece `payment_provider='stripe'` y `payment_id=<payment_intent_id>` en columnas (solo si están NULL)
  - Asegura `payment_method='card'` si no está establecido

#### Flujo TRANSFERENCIA
- ✅ **create-order** (`/api/checkout/create-order`):
  - Para `payment_method='bank_transfer'`: establece `payment_provider='bank_transfer'`, `payment_status='pending'`, `payment_id=NULL`

#### save-order
- ✅ **save-order** (`/api/checkout/save-order`):
  - No sobreescribe `payment_provider` y `payment_id` si ya están establecidos
  - Solo actualiza si las columnas están NULL

### 2. Actualización de tipos TypeScript

- ✅ Actualizado `OrderSummary` y `OrderDetail` en `src/lib/supabase/orders.server.ts`:
  - Agregados `payment_provider: string | null` y `payment_id: string | null`
- ✅ Actualizados todos los `select` queries para incluir `payment_provider` y `payment_id`
- ✅ Actualizado mapeo de datos en funciones de fetch

### 3. Admin UI (solo lectura)

- ✅ **Detalle de pedido** (`/admin/pedidos/[id]`):
  - Sección "Pago" mejorada con prioridad de columnas:
    - `payment_provider`: `order.payment_provider` → `metadata.payment_provider` → inferir desde `stripe_payment_intent_id`
    - `payment_id`: `order.payment_id` → `metadata.payment_id` → `metadata.stripe_payment_intent_id` → `metadata.checkout_session_id`
  - Mantiene compatibilidad con metadata para órdenes antiguas

### 4. Backfill SQL

- ✅ Script idempotente: `ops/sql/backfill_payment_columns_from_metadata.sql`
  - Migra datos desde `metadata` a columnas reales (solo cuando están NULL)
  - Seguro: no rompe órdenes sin metadata compatible

## ✅ Validaciones

- ✅ `pnpm typecheck` - Sin errores
- ✅ `pnpm build` - Compilación exitosa
- ✅ `pnpm lint` - Solo warnings preexistentes (no relacionados con estos cambios)

## ⚠️ Paso obligatorio post-merge

**Ejecutar en Supabase SQL Editor:**

```sql
-- Ver ops/sql/backfill_payment_columns_from_metadata.sql
```

El script rellenará `payment_provider` y `payment_id` en órdenes existentes usando datos de `metadata` cuando sea posible.

## 🧪 Testing

- [ ] Verificar que nueva compra con tarjeta: `orders.payment_provider='stripe'` y `orders.payment_id` poblado automáticamente
- [ ] Verificar que nueva compra por transferencia: `orders.payment_provider='bank_transfer'` y `payment_status='pending'`
- [ ] Verificar que Admin muestra provider/id sin depender de metadata en nuevas órdenes
- [ ] Verificar que Admin mantiene compatibilidad con órdenes antiguas (fallback a metadata)

## 📝 Notas

<<<<<<< HEAD
- No se cambió lógica de negocio, solo persistencia y visualización
- Los tipos TypeScript están actualizados
- Compatible con SSR (no rompe server components)
- Mantiene compatibilidad hacia atrás: si columnas están NULL, Admin hace fallback a metadata
=======
- [x] Código compila sin errores
- [x] Build exitoso
- [x] Lint sin errores nuevos
- [x] Selector de color funcional
- [x] Persistencia en order_items implementada
- [x] Visualización en carrito/checkout/pedidos
- [x] Script SQL incluido
- [ ] Script SQL ejecutado en Supabase (post-merge)
>>>>>>> origin/main
>>>>>>> origin/main
