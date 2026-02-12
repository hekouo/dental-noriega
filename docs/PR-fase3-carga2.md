# PR — FASE 3 / CARGA 2: /tienda vitrina (rails + bento) — UI-only

## Objetivo

Hacer de `/tienda` un cambio muy notorio pero seguro:

1. Encabezado editorial (ya existe StorefrontListHeader en la sección de destacados).
2. Secciones tipo vitrina (rails horizontales) usando solo data existente (`getFeaturedItems`, `getSections`).
3. Ritmo visual con bloques tipo bento (CSS grid), sin assets pesados (solo gradientes e íconos Lucide).
4. Fallback: si falta data o algo falla, se renderiza el grid actual (FeaturedGrid / SectionExplorer) como hoy.

## Cambios

### Componentes nuevos

- **`src/components/storefront/ProductRail.tsx`** (client)  
  Rail horizontal con `overflow-x-auto`, `scroll-snap`, `gap`. Botones prev/next opcionales (solo UI, sin deps). Reutiliza `ProductCard`. Props: `items` (FeaturedItem[]), `title?`, `showPrevNext?`, `className?`.

- **`src/components/storefront/SectionLinksRail.tsx`** (server)  
  Rail horizontal de enlaces a categorías. Props: `sections` (SectionInfo[]), `title?`, `className?`. Usa `ROUTES.section(slug)`.

- **`src/components/storefront/BentoDestacadosTile.client.tsx`** (client)  
  Tile bento que muestra un rail corto de destacados (slice 0–6). Si no hay items, muestra mensaje “Pronto más destacados”.

- **`src/components/storefront/TiendaVitrina.tsx`** (server)  
  Orquesta la vitrina: llama a `getFeaturedItems()` y `getSections(8)` en `try/catch`; si falla retorna `null`. Renderiza:
  - Bento (grid 3 tiles): editorial (copy), Destacados (BentoDestacadosTile), Explora por categoría (link a `#section-explorer-heading`).
  - Rail “Destacados” (ProductRail) solo si hay featured.
  - Rail “Explora por categoría” (SectionLinksRail) solo si hay sections.

### Archivos tocados

- `src/app/tienda/page.tsx`: se inserta `<Suspense fallback={null}><TiendaVitrina /></Suspense>` entre QuickSearchBar y SectionExplorer. El contenido actual (SectionExplorer + FeaturedItemsSection) se mantiene como fallback.

### No modificado

- `getFeaturedItems()`, `getSections()`, `/api/products/search`.
- `ProductCard`, `FeaturedGrid`, `SectionExplorer` (solo reutilizados).
- Endpoints, checkout, admin, shipping, pagos.
- Sin dependencias nuevas. Sin “modo oscuro” ni assets pesados (solo gradientes/íconos Lucide).

## QA manual

### /tienda — Desktop (1440 / 1280)

1. Entrar a `/tienda`.
2. Bento: 3 tiles visibles (editorial, Destacados con rail corto, Explora por categoría). Sin overflow raro.
3. Rail “Destacados”: scroll horizontal; botones Anterior/Siguiente desplazan el rail.
4. Rail “Explora por categoría”: enlaces a secciones con scroll horizontal.
5. Más abajo: SectionExplorer y sección “Productos destacados” (grid o empty state) igual que antes.

### /tienda — Móvil (390 / 360)

1. Bento: tiles apilados; tile Destacados con scroll horizontal (swipe).
2. Rails: swipe horizontal funciona; tap targets ≥ 44px (botones prev/next, enlaces).
3. Fallback: si no hay destacados, el bento muestra “Pronto más destacados” en el tile y la sección “Productos destacados” muestra el empty state con chips/CTAs.

### Fallback

- Si `getFeaturedItems()` o `getSections()` fallan, `TiendaVitrina` retorna `null` y la página muestra solo hero, TrustBanners, QuickSearchBar, SectionExplorer y FeaturedItemsSection (grid o empty como hoy).

## Confirmación

**UI-only.** Sin cambios de lógica de datos ni de endpoints.

## Validación

- `pnpm lint` (acepta warnings preexistentes).
- `pnpm build` (debe pasar).
