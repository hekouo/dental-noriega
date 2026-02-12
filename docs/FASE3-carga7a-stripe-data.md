# FASE 3 / CARGA 7A: Auditoría de datos Stripe para receipts/invoices (DOCS ONLY)

**Objetivo:** Confirmar si el proyecto ya guarda datos suficientes por orden para obtener `receipt_url` (recibo) y/o `invoice_pdf` / `hosted_invoice_url` (factura) usando Stripe de forma READ-ONLY y segura.

**Alcance:** Solo documentación. Cero cambios de código en este PR.

---

## 1. Dónde se crea el pago

- **API:** `src/app/api/stripe/create-payment-intent/route.ts`
- **Flujo:** Se crea un **PaymentIntent** de Stripe con:
  - `metadata.order_id` (UUID de la orden en Supabase)
  - `receipt_email` (email del cliente para el recibo de Stripe)
  - Opcionalmente `customer` (Stripe Customer) si se pudo crear/buscar
- **Tras crear:** Se guarda en la orden (Supabase `orders`):
  - Columna `payment_id` = `paymentIntent.id` (ej. `pi_xxx`)
  - Columna `payment_provider` = `"stripe"`
  - Columna `payment_method` = `"card"` (si no estaba)
  - `metadata.stripe_payment_intent_id` = `paymentIntent.id`
- **No se crean** Invoices de Stripe (no se usa el producto Stripe Invoicing). Solo PaymentIntents.

---

## 2. Dónde se confirma el pago

- **API:** `src/app/api/stripe/webhook/route.ts`
- **Evento principal:** `payment_intent.succeeded`
  - Se resuelve `order_id` desde `PaymentIntent.metadata.order_id` o buscando por `metadata.stripe_payment_intent_id` en `orders`.
  - Se actualiza la orden: `payment_status = "paid"`, `payment_id = paymentIntent.id`, `metadata.stripe_payment_intent_id = paymentIntent.id`.
  - No se guarda `charge_id` ni `receipt_url` ni ningún campo de Invoice.

---

## 3. Qué se guarda en Supabase `orders` respecto a Stripe

| Campo / Ubicación | Nombre exacto | Ejemplo / Descripción |
|-------------------|---------------|------------------------|
| Columna | `payment_provider` | `"stripe"` |
| Columna | `payment_id` | `pi_xxxxxxxxxxxx` (ID del PaymentIntent) |
| Columna | `payment_status` | `"paid"` / `"pending"` / etc. |
| Columna | `payment_method` | `"card"` |
| metadata (JSONB) | `metadata.stripe_payment_intent_id` | `pi_xxxxxxxxxxxx` (mismo que `payment_id`) |
| metadata | `metadata.order_id` | No en orders; sí en PaymentIntent.metadata en Stripe |

**No se guardan hoy:** `charge_id`, `receipt_url`, `invoice_id`, `invoice_pdf`, `hosted_invoice_url`.

---

## 4. Qué lee /checkout/gracias (GraciasContent) y de dónde sale orderDataFromStorage

- **Origen de `orderDataFromStorage`:**
  - **Clave:** `localStorage.getItem("DDN_LAST_ORDER_V1")` y/o `getWithTTL(KEYS.LAST_ORDER)` (`KEYS.LAST_ORDER = "DDN_LAST_ORDER_V1"`).
  - **Quién escribe:** Flujo de pago en `PagoClient.tsx`, `StripePaymentForm.tsx` (orden recién creada/confirmada; items, total_cents, order_id, status, etc.).
- **Contenido típico (en memoria/localStorage):** `order_id`, `items`, `total_cents`, `status` (ej. `"paid"`). **No** se escribe `receipt_url` ni `invoice_pdf_url` en ese objeto; por tanto en GraciasContent esos valores se leen como `null` (`(orderDataFromStorage as { receipt_url?, invoice_pdf_url? })?.receipt_url ?? null`).
- **Conclusión:** La UI de ReceiptDownloadsCard está preparada para recibir `receiptUrl` e `invoicePdfUrl`, pero hoy ninguna capa (ni Supabase ni localStorage) los persiste; habría que obtenerlos vía Stripe (o un endpoint nuestro que consulte Stripe) y pasarlos al cliente o guardarlos.

---

## 5. Tabla resumen: qué datos tenemos hoy por order

| Dato | ¿Lo tenemos? | Dónde vive | Nombre exacto |
|------|--------------|------------|---------------|
| Order ID (UUID) | Sí | Supabase `orders.id`, PaymentIntent.metadata.order_id | `id`, `metadata.order_id` en Stripe |
| PaymentIntent ID | Sí | Supabase `orders.payment_id`, `orders.metadata.stripe_payment_intent_id` | `payment_id`, `metadata.stripe_payment_intent_id` |
| Charge ID | No | — | — |
| receipt_url | No | — | (se obtiene del Charge en Stripe, no se guarda en BD) |
| invoice_id / Invoice | No | El flujo no usa Stripe Invoices | — |
| invoice_pdf / hosted_invoice_url | No | Solo existen si se usara Stripe Invoicing | — |

---

## 6. Respuesta binaria

**SÍ tenemos IDs suficientes para consultar Stripe y obtener el recibo (receipt_url).**

- Tenemos `payment_id` (= PaymentIntent id) por orden en Supabase.
- Con la API de Stripe (READ-ONLY):
  1. `stripe.paymentIntents.retrieve(payment_id)` → obtenemos el PaymentIntent.
  2. El PaymentIntent tiene `latest_charge` (id del Charge una vez pagado).
  3. `stripe.charges.retrieve(charge_id)` → el Charge tiene `receipt_url` (URL del recibo alojado en Stripe).

**NO tenemos ni usamos Invoices de Stripe.** Por tanto, para este proyecto y flujo actual, **no** hay `invoice_pdf` ni `hosted_invoice_url` disponibles sin introducir el producto Stripe Invoicing (crear Invoices, etc.). La conclusión para factura PDF/URL es: **no se puede obtener con el flujo actual**; solo recibo (receipt_url) es viable con lo que ya guardamos.

---

## 7. Propuesta de endpoint READ-ONLY (solo diseño, no implementar en esta fase)

- **Ruta sugerida:** p. ej. `GET /api/account/orders/[orderId]/receipt` o `GET /api/checkout/receipt?order_id=...`.
- **Input:** `orderId` (UUID de la orden).
- **Auth:** Usuario autenticado (sesión) y **verificación de ownership:** la orden debe pertenecer al usuario (p. ej. `orders.email === session.email` o `orders.user_id === session.user.id`). No exponer datos de otras órdenes.
- **Lógica sugerida (READ-ONLY):**
  1. Obtener orden por `orderId`; si no existe o no pertenece al usuario → 404.
  2. Leer `payment_id` (PaymentIntent id). Si no hay o `payment_provider !== "stripe"` → 404 o 422.
  3. `stripe.paymentIntents.retrieve(payment_id)` (no expandir datos sensibles innecesarios).
  4. Si `latest_charge` existe, `stripe.charges.retrieve(latest_charge)` y leer `receipt_url`.
  5. Devolver `{ receipt_url: string | null }` (o redirección 302 a `receipt_url`). No devolver `invoice_pdf`/`hosted_invoice_url` a menos que en el futuro se use Stripe Invoicing.
- **Guardrails de seguridad:**
  - Solo lectura en Stripe (retrieve, no create/update).
  - Validar ownership de la orden antes de llamar a Stripe.
  - Rate limit por usuario/IP para evitar abuso.
  - No loguear `receipt_url` en producción.
  - Usar claves de API de Stripe con permisos mínimos (solo lectura si es posible).

---

## 8. Si en el futuro se quisiera factura (invoice_pdf / hosted_invoice_url)

- **Qué faltaría:** El flujo actual no crea Invoices en Stripe. Para tener `invoice_pdf` o `hosted_invoice_url` haría falta:
  - Usar Stripe Invoicing: crear Invoice (y opcionalmente InvoiceItems) tras el pago, o integrar Invoices en el flujo de checkout.
  - Guardar en la orden algo como `invoice_id` (y quizá `invoice_pdf_url`/`hosted_invoice_url` si Stripe lo devuelve y se quiere cachear).
- **Dónde podría guardarse:** En el webhook `payment_intent.succeeded` (crear Invoice después del pago y guardar `invoice_id` en `orders.metadata`) o en un job asíncrono; o en un endpoint dedicado que cree la factura bajo demanda (con los mismos criterios de ownership).
- **Riesgos / por qué no se implementa en esta fase:** Introducir Invoicing implica cambios de flujo, posibles costes/planes de Stripe, y requisitos legales/fiscales (RFC, CFDI, etc.). No se implementa aquí sin confirmación explícita y definición de requisitos.

---

## 9. Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Tenemos datos suficientes para obtener **receipt_url** (recibo)? | **Sí.** Con `payment_id` (PaymentIntent id) ya guardado podemos, vía Stripe READ-ONLY, obtener el Charge y su `receipt_url`. |
| ¿Tenemos datos suficientes para **invoice_pdf** / **hosted_invoice_url**? | **No.** El proyecto no usa Stripe Invoices; esos campos no existen en el flujo actual. |
| ¿Se puede hacer sin cambiar el flujo de pago? | Para **recibo**, sí: solo hace falta un endpoint READ-ONLY que, con el `payment_id` ya guardado, consulte Stripe y devuelva (o redirija a) `receipt_url`. Para **factura**, no sin añadir Stripe Invoicing y/o guardar `invoice_id`. |

Este documento es solo auditoría y propuesta. No incluye implementación de código ni nuevos endpoints.
