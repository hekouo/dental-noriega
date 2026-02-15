# PR-H2: Bento trust + categorías bento

## Objetivo

- Añadir una sección editorial tipo bento de confianza/valor (trust, B2B, soporte, envíos).
- Rediseñar categorías como bento grid (2 grandes + varias pequeñas).
- Añadir separadores sutiles entre bloques (con `prefers-reduced-motion` respetado).

## Cambios

### Componentes comunes

| Archivo | Descripción |
|--------|-------------|
| `src/components/common/GlassCard.tsx` | Card reutilizable: `rounded-2xl`, borde suave (border + opacity), sombra ligera, soporte `className`, opcional `asChild` para futuro Slot. Sirve para tiles del bento. |
| `src/components/common/AnimatedSeparator.tsx` | Separador (línea horizontal o mini SVG). Con motion sutil; con `prefers-reduced-motion: reduce` queda estático (sin animación). |

### Componentes Home

| Archivo | Descripción |
|--------|-------------|
| `src/components/home/BentoSection.tsx` | Sección "Confianza y servicio" editorial. Grid responsive: desktop 4 columnas (1–2 tiles con `col-span-2`), mobile 1 columna. Tiles: Atención clínicas/doctores (MessageCircle), Envíos a todo México (Truck), Pago seguro (Shield), Factura y soporte (FileText). Usa GlassCard y lucide. |
| `src/components/home/CategoryGrid.tsx` | "Explora por categorías" en bento: 2 categorías grandes + 4–6 pequeñas. Cada card es enlace a sección/tienda. Hover: elevación suave. A11y: focus visible. |

### Integración

| Archivo | Cambio |
|--------|--------|
| `src/app/page.tsx` | Tras el hero: `<AnimatedSeparator />` → `<BentoSection />` → `<AnimatedSeparator />` → `<CategoryGrid />`. No se modifica el hero. |

### Estilo / motion

- Separador: keyframes `separator-fade` y `separator-draw` en `globals.css`; con `@media (prefers-reduced-motion: reduce)` las animaciones se desactivan.
- Sin librerías nuevas.

## Archivos tocados / creados

- `src/components/common/GlassCard.tsx`
- `src/components/common/AnimatedSeparator.tsx`
- `src/components/home/BentoSection.tsx`
- `src/components/home/CategoryGrid.tsx`
- `src/app/page.tsx` (orden de secciones: hero → separador → bento → separador → categorías)
- `src/app/globals.css` (keyframes del separador, ya existentes)
- `src/lib/utils.ts` (utilidad `cn` para className; usa clsx + tailwind-merge ya en el proyecto)
- `docs/PR-H2_bento-categorias.md` (este archivo)

## QA manual

- **Desktop 1440px:** Bento 4 columnas, 2 tiles con `col-span-2`; CategoryGrid 2 grandes + pequeñas; separadores visibles.
- **Mobile 390px:** Una columna, sin overflow horizontal; bento y categorías apilados.
- **prefers-reduced-motion:** Separador estático (sin animación).
- **Focus visible:** Enlaces de CategoryGrid con anillo de foco visible.

## Confirmación

**No se tocó:** checkout, pagos/Stripe/webhook, Supabase (solo se usa `getSections` existente), admin, shipping, rutas API.

## Branch / Commit / PR

- **Branch:** `feat/home-pr-h2-bento-categories`
- **Commit (conventional):** `feat(home): pr-h2 bento trust + category grid`
- **PR:** Base `main`, title **PR-H2: Bento trust + categorías bento**, body: contenido de este documento.
