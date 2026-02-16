# PR-H5: Home polish + QA

## Objetivo
Pulir la Home (spacing, tipografía, responsive, accesibilidad), asegurar que el logo se vea bien en header/hero, y dejar checklist QA post-merge. Sin tocar checkout, pagos, admin ni shipping.

## Cambios por archivo

| Archivo | Cambio |
|---------|--------|
| `src/components/home/HeroIntro.tsx` | Spacing mobile (py/px), CTA sin salto de línea raro (whitespace-nowrap). |
| `src/components/common/IconRail.tsx` | Scroll hint con fade sutil (mask-image), confirmar no-scrollbar. |
| `src/components/home/ProductsRail.tsx` | Flechas solo desktop, padding lateral px-4 sm:px-6, alineación max-w-6xl. |
| `src/components/home/TestimonialsCarousel.tsx` | Quitar CARD_WIDTH si no se usa; botones prev/next con aria-label. |
| `src/components/home/FinalCTA.tsx` | Jerarquía: headline visible, subcopy, botones; contenedor con borde/glass. |
| `src/components/common/Logo.tsx` | Tamaños pares, priority solo en hero (size lg). |
| `src/app/layout.tsx` | Solo verificación: metadata.icons y manifest apuntan a /brand/*. |

## Checklist QA manual

- [ ] **Desktop (1440)** – Hero, IconRail, ProductsRail, Testimonials, FinalCTA se ven alineados y con buen espacio.
- [ ] **Mobile (390)** – Hero no apretado; CTAs no brincan de línea; rails con scroll horizontal.
- [ ] **Reduced motion** – Sin animaciones automáticas molestas; scroll manual funciona.
- [ ] **Dark mode** – Logo y secciones legibles; bordes y fondos coherentes.

## Confirmación
**No se tocó:** checkout, pagos, admin, shipping, Stripe, Supabase ni rutas API.
