# PR-H8: Home final A11y + responsive polish

## Objetivo
Cerrar “Home polish” con una pasada final de accesibilidad, consistencia visual y edge cases responsive, sin tocar checkout/pagos/envíos/admin/APIs. Scope pequeño, cambios quirúrgicos.

## Cambios

### A) A11y / Focus / Tap targets
- **ProductsRail:** Botones flecha con `focus-premium`, `aria-label` descriptivos (“Ver productos anteriores” / “Ver siguientes productos”), iconos con `aria-hidden`. Reduced motion ya aplicado (scroll `behavior: 'auto'`).
- **TestimonialsCarousel:** Botones prev/next con `focus-premium`, iconos `aria-hidden`. `aria-roledescription="carousel"` y auto-scroll desactivado con `prefersReducedMotion` (ya existente).
- **CategorySelector:** Links con `focus-premium` y `min-h-[44px]`, `aria-label` por pill (ya existente).

### B) Responsive / Overflow mobile
- **page.tsx:** Contenedores Home con `px-4 sm:px-6` (Trust Banners, Quiz CTA, separador, Featured, FinalThanks, HelpWidget). Sección “También te puede interesar” con `overflow-x-clip` y `dark:bg-gray-800/30`. Separador con `dark:via-gray-600` para dark mode.
- **TestimonialsCarousel:** `px-4 sm:px-6`, `overflow-x-clip` en la sección.
- Raíz Home ya tenía `overflow-x-clip max-w-full`.

### C) Reduced motion
- ProductsRail y TestimonialsCarousel ya usan `usePrefersReducedMotion()`: scroll con `behavior: 'auto'` y auto-scroll desactivado cuando hay reduced motion.

### D) Microcopy
- Sin cambios de copy en este PR.

## Archivos tocados
- `src/app/page.tsx` – padding consistente `px-4 sm:px-6`, overflow-x-clip y dark en secciones.
- `src/components/home/ProductsRail.tsx` – focus-premium en flechas, aria-labels e aria-hidden en iconos.
- `src/components/home/TestimonialsCarousel.tsx` – px-4 sm:px-6, overflow-x-clip, focus-premium y aria-hidden en botones.
- `src/components/home/CategorySelector.tsx` – focus-premium en links.

## QA checklist
- [ ] **Desktop 1440** – Home sin saltos, alineación consistente.
- [ ] **Mobile 390** – Sin overflow horizontal, CTAs correctos (tap targets ≥44px).
- [ ] **Dark mode** – Contraste correcto; separador y sección Featured visibles.
- [ ] **Reduced motion** – Sin animaciones automáticas; scroll manual con behavior auto.

## Confirmación
**No se tocó:** checkout, Stripe, webhooks, shipping, admin, Supabase ni APIs. Solo Home y componentes de UI listados.
