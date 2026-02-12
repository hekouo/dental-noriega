# PR #524 — FASE 3 / CARGA 7B: Stripe receipt_url (READ-ONLY) + integración mínima en /checkout/gracias

## Objetivo

Implementar un endpoint server-side READ-ONLY que, dado un `orderId` del usuario autenticado, devuelva `receipt_url` desde Stripe: `PaymentIntent` → `latest_charge` → `Charge.receipt_url`. Integración mínima para que `ReceiptDownloadsCard` muestre "Descargar recibo" solo cuando exista.

**NO se implementa:** `invoice_pdf` ni `hosted_invoice_url` (no usamos Stripe Invoices).

## Reglas (hard, prioridad máxima)

- NO modificar flujo de pagos (create-payment-intent, webhook, estados).
- NO crear ni editar nada en Stripe (solo lectura).
- NO tocar admin/shipping/skydropx.
- NO cambiar DB schema (sin migraciones).
- Seguridad obligatoria: sesión requerida, ownership validado (`orders.user_id === auth.user.id`), 404 si no coincide.
- Para órdenes sin `stripe_payment_intent_id` / `payment_id` o no pagadas: responder `{ receiptUrl: null }` sin romper UI.

## Cambios

### Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/app/api/stripe/receipt/route.ts` | **Nuevo.** Endpoint `GET /api/stripe/receipt?orderId=UUID`. Auth: Supabase server auth (cookies). Valida ownership: `orders.user_id === auth.user.id` (404 si no coincide). Resuelve PaymentIntent ID desde `metadata.stripe_payment_intent_id` o `payment_id`. Si no hay PI o no es `paid`, devuelve `{ receiptUrl: null }`. Llamadas Stripe READ-ONLY: `paymentIntents.retrieve(pi, { expand: ["latest_charge"] })` → `charges.retrieve` si es necesario → `receipt_url`. Respuesta: `{ receiptUrl: string | null }`. Headers: `Cache-Control: private, max-age=60`. |
| `src/app/checkout/gracias/GraciasContent.tsx` | **Integración mínima.** Estado `fetchedReceiptUrl` y `useEffect` que hace fetch a `/api/stripe/receipt?orderId=...` cuando `displayStatus === "paid"`, hay `orderRef` y no hay `receiptUrl` en `orderDataFromStorage`. Prioridad: `orderDataFromStorage.receipt_url` > `fetchedReceiptUrl` > `null`. Maneja errores silenciosamente (fallback UI). No toca lógica que decide "paid". |
| `docs/PR-fase3-carga7b.md` | Esta documentación. |

### No modificado

- Flujo de pagos (create-payment-intent, webhook).
- Admin, shipping, skydropx.
- DB schema (sin migraciones).
- Lógica de `displayStatus === "paid"` en GraciasContent.

## Seguridad

- **Auth:** Requiere sesión autenticada (`authSupabase.auth.getUser()`). Si no hay user → 401.
- **Ownership:** Valida `orders.user_id === auth.user.id`. Si no coincide → 404 (no filtrar existencia).
- **Stripe:** Solo lectura (`retrieve`, no `create`/`update`). Usa `STRIPE_SECRET_KEY` (server-only, no `NEXT_PUBLIC`).
- **Errores:** No expone detalles de Stripe ni existencia de órdenes. Devuelve `{ receiptUrl: null }` en caso de error.

## Casos que devuelven `{ receiptUrl: null }`

1. **bank_transfer:** No tiene PaymentIntent (`payment_provider !== "stripe"`).
2. **payment_id null:** No hay `stripe_payment_intent_id` en metadata ni `payment_id` en columna.
3. **No pagado:** `payment_status !== "paid"`.
4. **Stripe error:** Error al consultar PaymentIntent o Charge (no expone detalles).
5. **Stripe no configurado:** `STRIPE_SECRET_KEY` faltante.

## QA manual

### Caso 1: Orden pagada con tarjeta (Stripe)

1. Completar checkout con tarjeta de prueba.
2. En `/checkout/gracias` con `displayStatus === "paid"`:
   - Debe aparecer botón "Descargar recibo".
   - Al hacer clic, debe abrir el link de Stripe en nueva pestaña.
   - El link debe ser válido (hosted receipt de Stripe).

### Caso 2: Orden bank_transfer (pending)

1. Crear orden con método de pago "bank_transfer" (pending).
2. En `/checkout/gracias`:
   - NO debe aparecer botón "Descargar recibo".
   - Debe mostrarse bloque "Cómo facturar" con enlace a `/facturacion` y botón WhatsApp.

### Caso 3: Orden sin autenticación

1. Abrir `/checkout/gracias` sin sesión (o con sesión de otro usuario).
2. El endpoint debe devolver 401 o 404 según corresponda.
3. La UI no debe romperse (fallback a bloque "Cómo facturar").

## Confirmación

- **READ-ONLY:** Solo `retrieve` en Stripe, no `create`/`update`.
- **Ownership enforced:** `orders.user_id === auth.user.id` validado antes de consultar Stripe.
- **Sin endpoints de escritura:** No se crea ni modifica nada en Stripe ni Supabase.
- **Sin cambios de lógica de pagos:** No se toca create-payment-intent, webhook, ni estados de orden.

## Validación

- `pnpm lint` (exit 0)
- `pnpm build` (exit 0)

## Entregable

- PR contra main.
- Lista exacta de archivos tocados (arriba).
- Confirmación explícita: READ-ONLY, ownership enforced, sin endpoints de escritura, sin cambios de lógica de pagos.
