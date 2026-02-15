# PR-H3: Destacados compactos + testimonios

## Objetivo

- **Destacados compactos en Home:** rail horizontal con scroll-snap, cards más bajas (más productos por pantalla), flechas discretas solo en desktop.
- **Testimonios carrusel:** scroll-snap + botones prev/next, auto-scroll lento solo si NO reduced motion; accesible (aria-labels, focus, teclado).
- **(Opcional)** CategorySelector: 3 botones pill (Consumibles, Ortodoncia, Profilaxis) que llevan a /tienda.

## Cambios

### A) Destacados compactos

| Archivo | Descripción |
|--------|-------------|
| `src/components/home/ProductsRail.tsx` | Rail horizontal con scroll-snap, scrollbar discreto, scroll-padding. Cards compactas (ProductCard variant compact): imagen 4:3, título line-clamp-2, precio visible, acciones existentes (Agregar / Consultar WhatsApp). Flechas prev/next solo desktop; scrollBy con `behavior: prefersReducedMotion ? 'auto' : 'smooth'`. |

### B) Testimonios carrusel

| Archivo | Descripción |
|--------|-------------|
| `src/components/home/TestimonialsCarousel.tsx` | Array local de testimonios (name, city?, quote). Rail horizontal scroll-snap, botones prev/next con aria-label, pausa en hover/focus. Auto-scroll cada 7s solo si NO reduced motion; con reduced motion no hay auto-scroll. aria-roledescription="carousel", focus visible. |

### C) CategorySelector (opcional)

| Archivo | Descripción |
|--------|-------------|
| `src/components/home/CategorySelector.tsx` | 3 botones pill: Consumibles, Ortodoncia, Profilaxis. Enlace a /tienda (sin query para no romper contratos). Listo para filtro futuro. |

### Integración en Home

| Archivo | Cambio |
|--------|--------|
| `src/app/page.tsx` | Tras CategoryGrid (PR-H2): AnimatedSeparator → CategorySelector → ProductsRail (Destacados) → TestimonialsCarousel. Eliminada la sección anterior "Productos Destacados" con FeaturedCarousel para evitar duplicado; destacados pasan a ProductsRail. Orden: Hero → sep → bento → sep → categories → sep → CategorySelector → ProductsRail → TestimonialsCarousel → resto. |

## Archivos tocados / creados

- `src/components/home/ProductsRail.tsx` (nuevo)
- `src/components/home/TestimonialsCarousel.tsx` (nuevo)
- `src/components/home/CategorySelector.tsx` (nuevo)
- `src/app/page.tsx` (integración H3, eliminación FeaturedCarousel de Home)
- `docs/PR-H3_destacados-testimonios.md` (este archivo)

## QA manual

- **Desktop 1440px:** ProductsRail con flechas visibles y funcionales; scroll suave (o auto si reduced motion). Testimonios con prev/next y auto-scroll (si no reduced motion).
- **Mobile 390px:** Rail swipable, sin overflow horizontal; botones de carrusel accesibles.
- **prefers-reduced-motion:** Sin auto-scroll en testimonios; scroll con behavior 'auto' en rail y carrusel.

## Confirmación

**No se tocó:** checkout, Stripe/webhook, Supabase, admin, shipping, rutas API. Solo Home y componentes UI relacionados.

## Branch / Commit / PR

- **Branch:** `feat/home-pr-h3-featured-testimonials`
- **Commit (conventional):** `feat(home): pr-h3 compact featured rail + testimonials`
- **PR:** Base `main`, title **PR-H3: Destacados compactos + testimonios**, body: contenido de este documento.
