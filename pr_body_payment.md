## 🎯 Objetivo

Estandarizar el uso de `payment_provider` y `payment_id` en las columnas reales de `public.orders` en lugar de depender solo de `metadata`, manteniendo compatibilidad con órdenes existentes.

## 📋 Cambios realizados

### 1. Flujo CARD (Stripe)
- ✅ **Webhook Stripe** (`/api/stripe/webhook`):
  - Al confirmar pago (`payment_intent.succeeded`): establece `payment_provider='stripe'`, `payment_id=<payment_intent_id>`, `payment_method='card'`
  - Al fallar pago (`payment_intent.payment_failed`): establece `payment_provider='stripe'`, `payment_id=<payment_intent_id>`, `payment_method='card'`
- ✅ **create-payment-intent** (`/api/stripe/create-payment-intent`):
  - Al crear PaymentIntent: establece `payment_provider='stripe'` y `payment_id=<payment_intent_id>` en columnas (solo si están NULL)
  - Mantiene `stripe_payment_intent_id` en metadata para compatibilidad

### 2. Flujo TRANSFERENCIA / DEPÓSITO
- ✅ **create-order** (`/api/checkout/create-order`):
  - Para `payment_method='bank_transfer'`: establece `payment_provider='bank_transfer'`, `payment_status='pending'`
  - Para `payment_method='card'`: establece `payment_provider='stripe'` (se actualizará cuando se cree PaymentIntent)

### 3. save-order
- ✅ Actualizado para no sobreescribir `payment_provider` y `payment_id` si ya están establecidos
- ✅ Solo actualiza si las columnas están NULL y vienen valores en el payload

### 4. Tipos TypeScript
- ✅ Actualizado `OrderSummary` type para incluir `payment_provider` y `payment_id`
- ✅ Actualizados todos los selects y mapeos en `orders.server.ts` para incluir estas columnas

### 5. Admin UI
- ✅ Actualizado `/admin/pedidos/[id]` para priorizar columnas con fallback a metadata:
  - `payment_provider`: usa `order.payment_provider` o fallback a `metadata.payment_provider`
  - `payment_id`: usa `order.payment_id` o fallback a `metadata.stripe_payment_intent_id`

### 6. Backfill SQL
- ✅ Creado script `ops/sql/backfill_payment_columns_from_metadata.sql`
- ✅ Idempotente: solo actualiza cuando las columnas están NULL
- ✅ Mapea desde metadata:
  - `payment_provider`: desde `metadata.payment_provider` o infiere desde `metadata.stripe_payment_intent_id` o `payment_method`
  - `payment_id`: desde `metadata.payment_id`, `metadata.stripe_payment_intent_id` o `metadata.checkout_session_id`

## ✅ Validaciones

- ✅ `pnpm typecheck` - Sin errores
- ✅ `pnpm build` - Compilación exitosa
- ✅ `pnpm lint` - Solo warnings preexistentes

## 🧪 Testing

- [ ] Nueva compra con tarjeta: verificar que `orders.payment_provider='stripe'` y `orders.payment_id` se poblaron automáticamente
- [ ] Nueva compra por transferencia: verificar que `orders.payment_provider='bank_transfer'` y `payment_status='pending'`
- [ ] Admin muestra provider/id sin depender de metadata en nuevas órdenes
- [ ] Ejecutar backfill SQL en Supabase y verificar que se migraron órdenes existentes

## 📝 Notas

- **Compatibilidad**: El admin mantiene fallback a metadata para órdenes antiguas
- **Idempotencia**: Los updates solo establecen valores si las columnas están NULL (no sobreescriben)
- **Prioridad**: Columnas > metadata (las columnas tienen prioridad cuando existen)
- **Backfill**: El script SQL debe ejecutarse manualmente en Supabase después del merge

## 🔧 Paso obligatorio post-merge

Ejecutar en Supabase SQL Editor:
```sql
-- Ver ops/sql/backfill_payment_columns_from_metadata.sql
```

