# PR — FASE 3 / CARGA 3: /destacados editorial + rails (UI-only)

## Objetivo

Hacer /destacados muy notorio visualmente sin tocar lógica:

1. Hero editorial arriba (título + subtítulo + bullets de confianza).
2. Curación visual con un rail reutilizando ProductRail (CARGA 2).
3. Fallback: si algo falla o no hay items, se mantiene el comportamiento actual (empty state o FeaturedGrid como hoy).

## Cambios

### Componente nuevo

- **`src/components/storefront/DestacadosHero.tsx`** (server, sin client)  
  Hero con gradiente primary, título "Productos destacados", subtítulo y 3 bullets de confianza (Envío rápido, Atención WhatsApp, Puntos de lealtad) con iconos Lucide.

### Reutilizado

- **`src/components/storefront/ProductRail.tsx`** (ya existe en CARGA 2).

### Archivos tocados

- **`src/app/destacados/page.tsx`**  
  - Hero editorial (DestacadosHero) insertado al inicio.  
  - SectionHeader eliminado del layout (el hero incluye título y subtítulo).  
  - DestacadosContent: con items se renderiza 1 rail (ProductRail "Destacados") + FeaturedGrid debajo; sin items se mantiene el empty state actual (chips + CTAs).  
  - Sin nuevas queries ni agrupación por categorías; solo 1 rail + grid.

### No modificado

- getFeaturedItems(), FeaturedGrid, ProductCard canónica, endpoints, layout/header.

## QA manual

### /destacados — Desktop (1440 / 1280)

1. Entrar a `/destacados`.
2. Hero: título "Productos destacados", subtítulo y 3 bullets (Envío rápido, WhatsApp, Puntos); sin overflow raro.
3. Rail "Destacados": scroll horizontal; botones Anterior/Siguiente funcionan.
4. Grid: mismo FeaturedGrid que hoy debajo del rail.
5. Sin items: solo empty state con chips y CTAs (sin hero de rail).

### /destacados — Móvil (390 / 360)

1. Hero legible y apilado.
2. Rail: swipe horizontal funciona; tap targets ≥ 44px (prev/next, enlaces).
3. Sin overflow horizontal feo en la página.

## Confirmación

**UI-only.** Sin cambios de lógica, datos ni endpoints.

## Validación

- `pnpm lint` (acepta warnings preexistentes; si timeoutea, reintentar y reportar log).
- `pnpm build` (debe dar exit 0).
