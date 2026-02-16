# PR-H7: Header + Footer premium

## Objetivo
Pulir Header y Footer para que queden premium/editorial (spacing, tipografía, botones, focus, responsive) sin romper storefront ni tocar checkout/admin/shipping.

## Cambios

### Header
- **Logo:** `variant="mark" size="sm"` en mobile, `variant="horizontal" size="md"` en desktop (ya existente).
- **Contenedor:** `px-4 sm:px-6` y `py-3` para spacing consistente; `aria-label="Navegación principal"` en `<nav>`.
- **Sticky:** `min-h-[56px]` para evitar layout shift; `transition-shadow` + `motion-reduce:transition-none`; soporte dark (borde y bg).
- Nav items y botones ya tenían `min-h-[44px]`, `focus-premium` y `aria-label` en icon-only (búsqueda móvil, dark mode).

### Footer
- **Contenedor:** `px-4 sm:px-6` alineado con max-w-6xl.
- **Sello:** `<Logo variant="mark" size="sm" />` junto al título "Depósito Dental Noriega" (sin saturar).
- **Estructura:** Grid 1/2/3 columnas (mobile/tablet/desktop), links: Tienda, Destacados, Cómo comprar, Envíos, Facturación, Devoluciones, Contacto, Legal (Privacidad, Términos). Ya existente; se mantiene jerarquía (headline + links).
- **A11y:** `role="contentinfo"` en `<footer>`; links con `focus-premium`.

### A11y y reduced motion
- Focus visible vía clase `focus-premium` (outline en :focus-visible).
- Botones solo icono con `aria-label` (búsqueda móvil, dark mode).
- Header: `motion-reduce:transition-none` en transición de sombra.

## Archivos tocados
- `src/components/header/HeaderWithScrollEffect.tsx` – min-height, dark, motion-reduce.
- `src/app/layout.tsx` – nav padding y aria-label (solo bloque del header).
- `src/components/layout/Footer.tsx` – px-4 sm:px-6, Logo mark, role="contentinfo".

## QA checklist
- [ ] **Desktop 1440** – Header alineado, nav sin brincos, footer en grid limpio.
- [ ] **Mobile 390** – Header no se rompe, acciones clicables (44px), footer en columna sin overflow.
- [ ] **Dark mode** – Contraste correcto en header y footer.
- [ ] **Reduced motion** – Header sin transición de sombra; sin animaciones no solicitadas.

## Confirmación
**No se tocó:** checkout, pagos, envíos, admin, APIs. Solo Header, Footer y layout (bloque nav).
