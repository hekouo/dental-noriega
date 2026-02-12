# PR #521 — FASE 3 / CARGA 6: ReceiptDownloadsCard (Stripe-like) en /checkout/gracias (UI-only)

## Objetivo

Implementar una tarjeta estilo Stripe para "Recibo / Factura" en `/checkout/gracias`:

- UI premium (tarjeta centrada, borde suave, fondo claro heritage).
- Botones de descarga solo si existen URLs en la data (`receiptUrl` / `invoicePdfUrl`).
- Si no existen URLs: estado "no disponible" elegante + CTAs a `/facturacion` y WhatsApp.
- Sin tocar flujo de pagos, webhooks, órdenes ni estado de pago. Sin endpoints nuevos.

## Cambios

### Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/components/checkout/ReceiptDownloadsCard.tsx` | **Nuevo.** Componente con props `orderId?`, `receiptUrl?`, `invoicePdfUrl?`, `customerEmail?`. Si hay URLs → botones "Descargar recibo" / "Descargar factura" (min-h 44px, focus-premium, tap-feedback). Si no → texto neutro + Link a `/facturacion` + botón WhatsApp (`getWhatsAppUrl`). Tarjeta con borde stone, fondo stone-50/50, icono FileText. |
| `src/app/checkout/gracias/GraciasContent.tsx` | Integración: se renderiza `ReceiptDownloadsCard` cuando `displayStatus === "paid"`. Dentro del bloque de resumen (tras `OrderWhatsAppBlock`) se pasan `orderId`, `receiptUrl`/`invoicePdfUrl` desde `orderDataFromStorage` si existen (`receipt_url`, `invoice_pdf_url`), sino `null`; `customerEmail` desde checkout store. Si no hay resumen pero sí pago confirmado, se muestra la card en bloque aparte con props null. |
| `docs/PR-fase3-carga6.md` | Esta documentación. |

### No modificado

- Endpoints Stripe, checkout, webhook, órdenes, payment status.
- Admin, shipping, pagos.
- Sin dependencias nuevas.

## Fallback fuerte

- Si no hay `orderId`: la card se muestra igual; solo se omite la línea "Pedido X".
- Si no hay `receiptUrl` ni `invoicePdfUrl`: se muestra el bloque "no disponible" con Link a `/facturacion` y botón WhatsApp.
- Si no hay datos de orden/resumen: la card se muestra cuando `displayStatus === "paid"` con props null; no se rompe la página.

## QA manual

### /checkout/gracias

1. **Sin data de URLs (caso actual):** Tras un pago exitoso, debe verse la tarjeta "Recibo / Factura" con mensaje neutro, link "Información de facturación" a `/facturacion` y botón "Pedir por WhatsApp". Sin errores ni layout roto.
2. **Sin orderId / sin resumen:** Si por algún motivo no hay resumen pero sí `displayStatus === "paid"`, la card debe mostrarse con los CTAs de fallback.
3. **Simular URLs (mock dev):** Si en el futuro `orderDataFromStorage` incluye `receipt_url` o `invoice_pdf_url`, los botones "Descargar recibo" / "Descargar factura" deben aparecer y abrir en nueva pestaña.

### Comprobaciones rápidas

- Botones/enlaces con min-h 44px, focus-premium y tap-feedback.
- Tarjeta con borde suave y fondo claro (heritage).
- Texto neutro; no se promete facturación automática.

## Confirmación

- **UI-only.** No se crean endpoints Stripe. No se modifica lógica de checkout, webhook, órdenes ni payment status. No se toca admin/shipping/pagos. Sin dependencias nuevas.

## Validación

- `pnpm lint` (exit 0).
- `pnpm build` (exit 0).

## Entregable

- Link del PR + checks en verde + lista de archivos tocados (arriba).
