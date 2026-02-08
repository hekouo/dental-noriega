# PR: ui/catalog-ui-polish

## Objetivo
Mejorar UI del catálogo (/tienda), búsqueda (/buscar) y cards. Solo UI/UX; sin cambios en endpoints ni lógica de queries.

## Cambios realizados

### 1) ProductCard (`src/components/catalog/ProductCard.tsx`)
- **Card**: padding `p-3` → `p-4`; sombra `hover:shadow-xl` → `hover:shadow-md`; añadido `min-w-0` para evitar overflow.
- **Título**: ya tenía `line-clamp-2 min-h-[2.5rem]`; sin cambios.
- **Controles**: layout `flex flex-col sm:flex-row gap-2` para que en mobile el botón sea full width debajo del quantity.
- **Botones**: CTA principal y enlace WhatsApp con `min-h-[44px]`; botón principal `w-full sm:flex-1` (full width en mobile).

### 2) Grid
- **Catálogo sección** (`src/app/catalogo/[section]/page.tsx`): grid `gap-6` → `gap-4`; breakpoints `sm:2 lg:3 xl:4` → `sm:2 md:3 lg:4`; añadido `min-w-0`.
- **Búsqueda** (`src/app/buscar/page.tsx`): grid con `min-w-0`; cada item con `className="min-w-0"`.
- **FeaturedGrid** (`src/components/FeaturedGrid.tsx`): grid `grid-cols-2 md:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 min-w-0`; wrapper de cada card con `min-w-0`.
- **ProductsGridSkeleton** (`src/components/products/ProductsGridSkeleton.tsx`): `grid-cols-2` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`; añadido `min-w-0`.

### 3) Búsqueda
- **SearchAutocomplete** (`src/components/search/SearchAutocomplete.client.tsx`): input con `focus:ring-offset-2` para foco más visible.
- **HeaderSearchBar** (`src/components/header/HeaderSearchBar.client.tsx`): wrapper con `min-w-0` y `role="search"`.
- **HeaderSearchMobile** (`src/components/header/HeaderSearchMobile.client.tsx`): botón abrir/cerrar con `min-h-[44px] min-w-[44px] inline-flex items-center justify-center` (área táctil 44px).
- **Empty state** (`src/app/buscar/page.tsx`): card de “no resultados” con `role="status" aria-live="polite"`.
- **Skeleton**: `buscar/loading.tsx` ya usa `ProductsGridSkeleton`; grid del skeleton alineado a 1/2/3/4 columnas.

## Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/components/catalog/ProductCard.tsx` | Padding, sombra, min-w-0, layout controles, min-h-[44px] y full width mobile en botones |
| `src/app/catalogo/[section]/page.tsx` | Grid gap-4, breakpoints md:3, min-w-0 |
| `src/app/buscar/page.tsx` | Grid min-w-0, item min-w-0, empty state role/aria-live |
| `src/components/products/ProductsGridSkeleton.tsx` | Grid 1/2/3/4 cols, min-w-0 |
| `src/components/search/SearchAutocomplete.client.tsx` | Input focus:ring-offset-2 |
| `src/components/header/HeaderSearchBar.client.tsx` | min-w-0, role="search" |
| `src/components/header/HeaderSearchMobile.client.tsx` | Botones min-h/min-w 44px |
| `src/components/FeaturedGrid.tsx` | Grid 1/2/3/4 cols, min-w-0, item min-w-0 |

## QA manual

### /tienda (mobile + desktop)
- [ ] Productos destacados en grid 1 col mobile, 2/3/4 en sm/md/lg.
- [ ] Cards con padding consistente; títulos largos con line-clamp (2 líneas).
- [ ] Botón “Agregar” / “Elegir opciones” full width en mobile y min-h 44px.
- [ ] Enlace WhatsApp full width y min-h 44px.
- [ ] Sin overflow horizontal.

### /buscar (mobile + desktop)
- [ ] Input de búsqueda con foco visible (ring + offset).
- [ ] Resultados en grid 1/2/3/4; sin overflow.
- [ ] Empty state se ve bien y anuncia “no resultados” (role/aria-live).
- [ ] Loading muestra skeleton con mismo grid 1/2/3/4.

### Catálogo por sección (ej. /catalogo/consumibles)
- [ ] Grid 1/2/3/4 con gap-4; sin overflow.
- [ ] Cards alineadas; precio y badges visibles.

### Header búsqueda
- [ ] Desktop: barra de búsqueda con buen tamaño y foco.
- [ ] Mobile: botón de búsqueda con área táctil ≥44px; panel con input y botón cerrar ≥44px.

## Rama

- `ui/catalog-ui-polish`
