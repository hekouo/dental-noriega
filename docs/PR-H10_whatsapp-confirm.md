# PR-H10: WhatsApp confirmado en checkout

## Objetivo
Implementar UX simple para WhatsApp en checkout:
- Checkbox “Este es mi número de WhatsApp”
- Texto aclaratorio debajo
- Guardar en `orders.metadata` como `whatsapp_confirmed` (boolean)
- Sin romper checkout/pagos/envíos/admin

## Archivos tocados
- `src/lib/checkout/schemas.ts` – `whatsappConfirmed` con default false; tipo `DatosFormValues` para formulario
- `src/app/checkout/datos/ClientPage.tsx` – checkbox “Este es mi número de WhatsApp”, helper, A11y (id/htmlFor, focus-premium), min-h-[44px] en row; persistencia vía setDatos
- `src/components/checkout/AddressAutocompleteClient.tsx` – prop `setValue` tipada con `DatosFormValues` (compatibilidad)
- `src/app/admin/pedidos/[id]/page.tsx` – badge “WhatsApp confirmado: Sí/No” en detalle de pedido (solo si existe en metadata)

No se modificaron: `save-order`, `create-order`, `PagoClient` (ya persistían `whatsapp_confirmed` en metadata).

## QA checklist
- [ ] Checkout datos: ingresar teléfono, marcar/desmarcar checkbox, completar flujo hasta guardar orden
- [ ] Verificar que `metadata.whatsapp_confirmed` está en la orden (logs/server o DB)
- [ ] Admin detalle de pedido: se muestra “WhatsApp confirmado: Sí/No” cuando existe el campo
- [ ] `pnpm -s verify` exit 0
- [ ] A11y: label asociado al checkbox, focus-visible (focus-premium), área clicable amplia

## Confirmación
**No se tocó:** checkout payments, Stripe, webhooks, shipping APIs, admin APIs. Solo formulario de datos de contacto en checkout, persistencia en metadata existente y visualización opcional en admin detalle de pedido.
