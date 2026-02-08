# PR: ui/checkout-ui-polish

## Objetivo
Mejorar solo la **presentación** del checkout: legibilidad, spacing, orden visual, estado de pasos, resumen colapsable en mobile. Sin tocar lógica de shipping, stripe ni supabase writes.

## Cambios realizados

### 1) Inputs y secciones (checkout/datos)
- **Labels**: sin cambios de copy; inputs con `min-h-[44px]`, `rounded-lg`, `focus:ring-offset-2` para mejor foco.
- **Spacing**: `space-y-6` en form; secciones con espaciado vertical consistente.
- **Inputs**: full width en mobile; grid 2 columnas en desktop (nombre/apellido, ciudad/estado/CP) ya existente.
- **Sticky CTA en mobile**: barra de botones (Volver al carrito + Continuar al pago) con `sticky bottom-0` en mobile, `min-h-[44px]`, para que el teclado no tape el CTA. En desktop `sm:static`.
- **Main**: `pb-24 md:pb-6` para dar espacio al sticky en mobile.

### 2) Resumen de pedido (checkout/pago)
- **CheckoutOrderSummary**: nuevo prop `collapsibleOnMobile`.
- **En mobile** (max-lg): el resumen se muestra dentro de un `<details>` con `<summary>` que muestra "Resumen del pedido (N productos) · Total: $X" para que totales y CTA se vean rápido; al abrir se ve el desglose completo.
- **En desktop** (lg): sin cambios; resumen siempre visible en sidebar.

### 3) Estado de pasos
- **CheckoutStepIndicatorThree**: nuevo componente visual "Dirección → Envío → Pago" basado solo en la ruta actual.
- **Rutas**: en `/checkout/datos` se muestra paso 1 (Dirección) activo; en `/checkout/pago` pasos 1 y 2 completados, paso 3 (Pago) activo.
- **Uso**: en `checkout/datos` y `checkout/pago` se reemplaza el stepper de 4 pasos por este indicador de 3 pasos (solo UI; no se cambia lógica de navegación ni validación).

### 4) Pago (checkout/pago)
- **Sticky CTA en mobile**: misma idea que en datos; barra de botones (Volver a datos + Pagar ahora) con `sticky bottom-0` y `min-h-[44px]`.
- **Contenedor**: `pb-24 md:pb-6` para espacio bajo el sticky en mobile.

## Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/components/checkout/CheckoutStepIndicatorThree.tsx` | Nuevo: indicador visual Dirección → Envío → Pago (solo ruta) |
| `src/components/checkout/CheckoutOrderSummary.tsx` | Prop `collapsibleOnMobile`; en mobile details/summary con total en cabecera |
| `src/app/checkout/datos/ClientPage.tsx` | CheckoutStepIndicatorThree; inputs min-h/rounded/focus; botones sticky en mobile; pb-24 |
| `src/app/checkout/pago/PagoClient.tsx` | CheckoutStepIndicatorThree; CheckoutOrderSummary collapsibleOnMobile; botones sticky en mobile; pb-24 |

## QA manual

- **Dirección (/checkout/datos)**  
  - [ ] Indicador de 3 pasos: "Dirección" activo.  
  - [ ] Inputs con min-h 44px y foco visible.  
  - [ ] En mobile, barra de botones fija abajo; no la tapa el teclado al hacer scroll.  
  - [ ] Volver al carrito y Continuar al pago visibles y usables.

- **Pago (/checkout/pago)**  
  - [ ] Indicador: Dirección y Envío completados, "Pago" activo.  
  - [ ] En mobile, resumen colapsable: cabecera con "Resumen (N productos) · Total: $X"; al abrir se ve el desglose.  
  - [ ] En desktop, resumen siempre visible en la columna derecha.  
  - [ ] Barra de botones (Volver a datos + Pagar) sticky en mobile con min-h 44px.

- **Flujo completo (modo dev si es posible)**  
  - [ ] Carrito → Datos (dirección + envío) → Pago → Confirmación; sin cambios de comportamiento ni validaciones.

## Screenshots

- Antes/después del checkout en mobile: recomendado capturar /checkout/datos y /checkout/pago (indicador de pasos, resumen colapsable, botones sticky).

## Rama

- `ui/checkout-ui-polish`
