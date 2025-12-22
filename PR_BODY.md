## 🎯 Objetivo

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

- No se cambió lógica de negocio, solo persistencia y visualización
- Los tipos TypeScript están actualizados
- Compatible con SSR (no rompe server components)
- Mantiene compatibilidad hacia atrás: si columnas están NULL, Admin hace fallback a metadata
