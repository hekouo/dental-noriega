# PR-H6: Bento trust + categorías

## Objetivo
Implementar el bloque Bento Trust + Category Grid tipo bento en Home (según revisión UI/UX), manteniendo lo ya mergeado (H1/H4/H5) y sin tocar checkout, pagos, admin ni shipping.

## Cambios

| Área | Cambio |
|------|--------|
| **BentoSection** | 4 tiles editoriales (2 grandes col-span-2, 2 normales), GlassCard, spacing max-w-6xl px-4 sm:px-6. |
| **CategoryGrid** | Grid 3–6 categorías, desktop con al menos 1 card más grande, mobile 1 columna, CTA a /tienda o sección. |
| **AnimatedSeparator** | Separador entre bloques; animación solo cuando no hay prefers-reduced-motion (globals.css). |
| **GlassCard** | Card reutilizable: border + bg blur + rounded-2xl (ya existente). |
| **Home page** | Orden: HeroIntro → AnimatedSeparator → BentoSection → AnimatedSeparator → CategoryGrid → (resto H3/H5). |

## Archivos tocados
- `src/components/home/BentoSection.tsx` – spacing px-4 sm:px-6.
- `src/components/home/CategoryGrid.tsx` – spacing px-4 sm:px-6, motion-reduce en hover.
- `src/components/common/AnimatedSeparator.tsx` – verificado (fallback reduce en globals.css).
- `src/components/common/GlassCard.tsx` – verificado (sin cambios).
- `src/app/globals.css` – verificado: keyframes separador + `@media (prefers-reduced-motion: reduce)`.
- `src/app/page.tsx` – orden ya correcto (sin cambios en este PR).

## QA checklist
- [ ] **Desktop 1440** – Bento balanceado, sin overflow; categorías alineadas.
- [ ] **Mobile 390** – Sin texto aplastado, cards full width; separadores no causan scroll lateral.
- [ ] **Reduced motion** – Nada se anima (separador estático, hover sin translate).
- [ ] **Dark mode** – Bordes y fondos legibles en Bento y CategoryGrid.

## Confirmación
**No se tocó:** checkout, pagos, admin, shipping, Stripe, Supabase, Skydropx ni rutas API. Solo Home y componentes UI.
