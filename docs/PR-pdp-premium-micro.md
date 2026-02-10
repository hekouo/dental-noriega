# PR: PDP premium micro pass

**Branch:** `ui/pdp-premium-micro`  
**Título PR:** ui: pdp premium micro pass  
**Objetivo:** Subir la calidad “premium heritage” en PDP (`/catalogo/[section]/[slug]`) con microinteracciones sutiles. Solo UI; sin tocar lógica de negocio, data fetching, add-to-cart, Supabase/Stripe/Skydropx, admin ni endpoints.

---

## Alcance

- **Jerarquía PDP:** Título con `leading-tight` y `line-clamp-4` para títulos largos; precio con `tracking-tight`; sección/categoría y stock en `text-stone-600`; espaciado y `min-w-0` en contenedor del título.
- **Gallery premium:** Contenedor con borde `border-stone-200/90`, `rounded-xl`, sombra suave; imagen principal con transición suave en desktop: hover `scale-[1.02]` (200ms, ease-out); mobile sin hover; thumbnails con `focus-premium` y bordes stone. Respeta `prefers-reduced-motion` (sin scale en hover cuando reduce).
- **CTA pulse:** Botones “Agregar al carrito” y “Comprar ahora” (ProductActions) y sticky CTA (PdpStickyCTA): estado local `pulse` que aplica clase `cta-pulse-active` durante 180ms al click; clase global `.cta-pulse` con `scale(0.98)`; desactivado bajo `prefers-reduced-motion`. No se modificó la lógica de los handlers.
- **CTA feedback:** `focus-premium`, `tap-feedback`, `min-h-[44px]` en CTAs principales y enlace WhatsApp (ProductActions y PdpStickyCTA).
- **Related products:** Sección con borde `border-stone-200/80`; heading con `tracking-tight`; texto secundario `text-stone-600`; link “Ver más de esta categoría” con tap target ≥44px y `focus-premium` / `tap-feedback`. Las cards usan `ProductCard` (ya tiene pills, hover-lift, tap-feedback).
- **globals.css:** Nueva clase `.cta-pulse` / `.cta-pulse-active` para el pulse visual; override en `prefers-reduced-motion` para no aplicar transform.

**No se tocó:** lógica de checkout/admin/shipping/pagos/endpoints ni rutas/contratos. No se modificó add-to-cart, store, APIs ni data fetching.

---

## Archivos tocados

| Archivo | Cambios |
|---------|---------|
| `src/app/globals.css` | Clases `.cta-pulse` / `.cta-pulse-active` y override reduced motion. |
| `src/app/catalogo/[section]/[slug]/page.tsx` | Jerarquía: título (leading-tight, line-clamp-4, min-w-0), precio (tracking-tight), texto stone. Solo clases. |
| `src/components/pdp/ProductGallery.client.tsx` | Borde/sombra heritage (stone), rounded-xl, hover scale 1.02 solo desktop y sin reduced motion; focus-premium en thumbnails y botón imagen. |
| `src/components/product/ProductActions.client.tsx` | Pulse al click (180ms) en Agregar al carrito y Comprar ahora; focus-premium, tap-feedback, min-h-[44px]; WhatsApp link con focus-premium tap-feedback. |
| `src/components/pdp/PdpStickyCTA.client.tsx` | Pulse al click en Agregar al carrito; focus-premium y tap-feedback en Link y button. |
| `src/components/pdp/RelatedProducts.tsx` | Borde stone en sección; heading y texto stone; link “Ver más” con tap target y focus-premium/tap-feedback. |
| `docs/PR-pdp-premium-micro.md` | Este documento. |

---

## QA manual obligatorio

### Desktop (1440 y 1280)

- [ ] Abrir 2 PDPs con títulos largos: jerarquía clara (título, precio, stock, CTA); título no rompe layout (line-clamp si aplica).
- [ ] Gallery: borde y sombra sutiles; hover sobre imagen principal produce scale muy leve (1.02) sin marear; thumbnails con foco premium.
- [ ] CTA “Agregar al carrito” y “Comprar ahora”: al hacer click, pulse breve (scale 0.98) ~180ms; foco con anillo premium.
- [ ] Related products: grid/carrusel legible; cards con hover-lift; link “Ver más de esta categoría” con foco premium.

### Mobile (390x844 y 360x800)

- [ ] Mismo PDP: jerarquía legible; sin overflow horizontal.
- [ ] Gallery: sin hover (solo estado normal); tap en imagen/thumbnails correcto.
- [ ] CTAs con tap target ≥44px; tap feedback al tocar.
- [ ] Sticky CTA: pulse al tocar “Agregar al carrito”; WhatsApp y botón con tap target OK.
- [ ] Related: carrusel con snap; tap targets OK.

### Reduced motion

- [ ] Activar `prefers-reduced-motion: reduce` y recargar PDP. Verificar: gallery sin scale en hover; CTA sin pulse (solo tap-feedback normal si aplica); contenido visible y usable.

### Contenido y lógica

- [ ] Confirmar que no se cambió copy crítico ni flujos de add-to-cart/checkout.
- [ ] Confirmación explícita: **No se tocó lógica de checkout/admin/shipping/pagos/endpoints ni rutas/contratos.**

---

## Validación

```bash
pnpm lint
pnpm build
```
