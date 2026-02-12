# PR #522 — FASE 3 / CARGA 6B: ReceiptDownloadsCard polish (UI-only, cero riesgo)

## Objetivo

Pulir la experiencia de "Recibo / Factura" en `/checkout/gracias` sin tocar pagos ni Stripe:

- Mejor copy (más claro, sin prometer facturación automática)
- Estados visuales (con y sin URLs)
- Detalles de layout (spacing, alineación, botones consistentes)
- Accesibilidad (aria, focus, targets 44px)

## Reglas (hard rules)

- NO crear endpoints Stripe.
- NO tocar checkout flow, webhook, orders update, payment status logic.
- NO tocar admin/shipping/pagos.
- Sin dependencias nuevas.
- No mover ni cambiar la condición de render: seguir mostrándolo solo cuando `displayStatus === "paid"`.

## Cambios

### Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/components/checkout/ReceiptDownloadsCard.tsx` | **Polish:** Título "Recibo y facturación". Sin URLs: copy "La descarga del recibo/factura no está disponible aquí." + "Si necesitas factura, usa el formulario de facturación o contáctanos por WhatsApp." Bloque "Cómo facturar" con Link principal a `/facturacion` (button style) "Abrir formulario de facturación", secundario "Contactar por WhatsApp". Opcional: mostrar "Correo: …" si `customerEmail` existe. A11y: `section` con `aria-labelledby`, `role="status"` en mensaje sin URLs, `role="group"` en acciones, `aria-label` en botones (Abrir formulario de facturación, Contactar por WhatsApp). min-h 44px, focus-premium, tap-feedback. Con URLs: botones "Descargar recibo/factura" con aria-labels. |
| `src/app/checkout/gracias/GraciasContent.tsx` | **Unificación:** ReceiptDownloadsCard se renderiza en un solo lugar cuando `displayStatus === "paid"` (después del bloque de resumen o del mensaje "no datos completos"). Eliminada la card de dentro del resumen y del bloque "no datos completos" para evitar duplicación visual. No se toca lógica de displayStatus ni de datos. |
| `docs/PR-fase3-carga6b.md` | Esta documentación. |

### No modificado

- Endpoints Stripe, checkout, webhook, órdenes, payment status.
- Admin, shipping, pagos.
- Condición de render: sigue siendo solo cuando `displayStatus === "paid"`.

## QA manual

### /checkout/gracias con displayStatus === "paid"

1. **Sin URLs:** Deben verse CTAs "Abrir formulario de facturación" (principal) y "Contactar por WhatsApp" (secundario). No deben aparecer botones de descarga. Copy: "La descarga del recibo/factura no está disponible aquí." y "Si necesitas factura, usa el formulario de facturación o contáctanos por WhatsApp." Si hay `customerEmail`, debe mostrarse "Correo: …".
2. **Con URLs (simular en dev):** Deben aparecer botones "Descargar recibo" y/o "Descargar factura".
3. **Sin duplicado:** La card "Recibo y facturación" debe aparecer una sola vez en la página (1440 y 390).

## Confirmación

**UI-only.** Sin endpoints Stripe, sin cambios de lógica de pagos/admin/shipping. Sin dependencias nuevas.

## Validación

- `pnpm lint` (exit 0)
- `pnpm build` (exit 0)

## Entregable

- Rama, commit (feat o chore), push y PR #522 contra main.
- Link del PR + estado de checks + lista exacta de archivos tocados.
