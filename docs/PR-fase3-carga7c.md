# PR #525 — FASE 3 / CARGA 7C: Mostrar "Descargar recibo" en /cuenta/pedidos/[id] (reuse API read-only)

## Objetivo

Reutilizar el endpoint ya mergeado `GET /api/stripe/receipt?orderId=UUID` para mostrar el bloque "Recibo y facturación" (`ReceiptDownloadsCard`) en el detalle de pedido del usuario en `/cuenta/pedidos` cuando se visualiza un pedido individual.

**Misma lógica que en `/checkout/gracias`:**
- Si hay `receiptUrl`: mostrar botón "Descargar recibo"
- Si no: fallback a `/facturacion` + WhatsApp

**NO se implementa:** `invoice_pdf` ni `hosted_invoice_url` (no usamos Stripe Invoices).

## Reglas (hard)

- NO crear endpoints nuevos (reutiliza `/api/stripe/receipt`).
- NO tocar webhook / create-payment-intent / estados de orden.
- NO tocar admin/shipping/skydropx.
- Ownership y auth ya están en el endpoint: NO duplicar lógica insegura.
- Mantener cambios pequeños y aislados.
- Sin dependencias nuevas.

## Cambios

### Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/app/cuenta/pedidos/page.tsx` | **Integración:** Importa `ReceiptDownloadsCard`. Estado `fetchedReceiptUrl` y `useEffect` que hace fetch a `/api/stripe/receipt?orderId=...` cuando `orderDetail.payment_status === "paid"`, usuario está autenticado (`isAuthenticated`) y no hay `receiptUrl` en `orderDetail.metadata`. Usa `fetchedOrderIdRef` para evitar múltiples fetches del mismo pedido. Prioridad: `orderDetail.metadata.receipt_url` > `fetchedReceiptUrl` > `null`. Renderiza `ReceiptDownloadsCard` después de `OrderWhatsAppBlock` solo cuando `payment_status === "paid"`. Maneja errores silenciosamente (fallback UI). |
| `docs/PR-fase3-carga7c.md` | Esta documentación. |

### No modificado

- Endpoints (reutiliza `/api/stripe/receipt` existente).
- Flujo de pagos (webhook, create-payment-intent, estados).
- Admin, shipping, skydropx.
- Lógica de autenticación (la página ya requiere auth).

## QA manual

### Caso 1: Pedido pagado con tarjeta (Stripe)

1. Ir a `/cuenta/pedidos`.
2. Buscar un pedido pagado con tarjeta (`payment_status === "paid"`, `payment_method === "card"`).
3. Hacer clic en "Ver detalle".
4. En el detalle del pedido:
   - Debe aparecer bloque "Recibo y facturación" después del bloque de WhatsApp.
   - Debe aparecer botón "Descargar recibo" (si el endpoint devuelve `receiptUrl`).
   - Al hacer clic, debe abrir el link de Stripe en nueva pestaña.

### Caso 2: Pedido por transferencia o no pagado

1. Ir a `/cuenta/pedidos`.
2. Buscar un pedido con `payment_method === "bank_transfer"` o `payment_status !== "paid"`.
3. Hacer clic en "Ver detalle".
4. En el detalle del pedido:
   - Si `payment_status !== "paid"`: NO debe aparecer bloque "Recibo y facturación".
   - Si `payment_status === "paid"` pero es `bank_transfer`: debe aparecer bloque "Recibo y facturación" pero sin botón "Descargar recibo" (solo `/facturacion` + WhatsApp).

## Confirmación

- **Sin endpoints nuevos:** Reutiliza `/api/stripe/receipt` ya mergeado en PR #524.
- **Sin cambios en lógica de pago:** No se toca webhook, create-payment-intent, ni estados de orden.
- **READ-ONLY:** El endpoint solo hace `retrieve` en Stripe, no crea ni modifica nada.
- **Ownership enforced:** El endpoint ya valida `orders.user_id === auth.user.id`; no se duplica lógica.

## Validación

- `pnpm lint` (exit 0)
- `pnpm build` (exit 0)

## Entregable

- PR contra main con cambios mínimos.
- Lista exacta de archivos tocados (arriba).
- Confirmación de que NO se creó endpoint nuevo y que se reutiliza `/api/stripe/receipt`.
