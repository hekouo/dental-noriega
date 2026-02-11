# FASE3: Mapeo de rutas y componentes de listado/búsqueda

**Objetivo:** Documentar la estructura de `/tienda`, `/buscar`, `/destacados`, cards, rails, SearchAutocomplete, skeletons y componentes de listado antes de cambios UI.

---

## 1. Rutas principales

### `/tienda` (`src/app/tienda/page.tsx`)
- **Tipo:** Server Component (async)
- **Fetch:** `getFeaturedItems()` (server-side)
- **Renderiza:**
  - Mini-hero con beneficios (gradiente primary)
  - `TrustBanners`
  - `QuickSearchBar` (wrapper de `SearchAutocomplete` con chips)
  - `SectionExplorer` (categorías con iconos)
  - `FeaturedItemsSection` (Suspense con skeleton):
    - Si hay items: `FeaturedGrid` con productos destacados
    - Si no hay: empty state con chips y CTAs
  - `HelpWidget`
- **Skeleton:** `ProductsGridSkeleton` (usa `ProductCardSkeleton`)

### `/buscar` (`src/app/buscar/page.tsx`)
- **Tipo:** Server Component (async)
- **Fetch:**
  - Sin query: solo `getFeaturedItems()` para recomendaciones
  - Con query: `fetch(/api/products/search?q=...)` (server-side fetch)
- **Renderiza:**
  - Sin query:
    - `QuickSearchBar`
    - Búsquedas populares (chips)
    - Categorías populares (chips)
  - Con query:
    - `QuickSearchBar` con `initialQuery`
    - `BuscarClient` (client component para tracking)
    - Cabecera con título y contador
    - `SearchInput` (sticky)
    - `SearchFiltersMobile` (botón sticky + bottom sheet)
    - `FiltersSelect` + `SortSelect` (desktop)
    - Grid de resultados: `SearchResultCard` (wrapper de `ProductCard`)
    - `Pagination`
    - Si no hay resultados: empty state + `FeaturedGrid` (destacados filtrados)
    - Si pocos resultados (≤3): sección "También te puede interesar" con `FeaturedGrid`
- **Skeleton:** No usa skeleton (fetch directo en server)

### `/destacados` (`src/app/destacados/page.tsx`)
- **Tipo:** Server Component (async)
- **Fetch:** `getFeaturedItems()` (server-side)
- **Renderiza:**
  - `SectionHeader` con watermark
  - `DestacadosContent` (Suspense):
    - Si hay items: `FeaturedGrid`
    - Si no hay: empty state con chips y CTAs
- **Skeleton:** `ProductsGridSkeleton`

### `/catalogo/[section]` (`src/app/catalogo/[section]/page.tsx`)
- **Tipo:** Server Component (async)
- **Fetch:** `getProductsBySectionFromView()` (server-side desde Supabase view)
- **Renderiza:** Grid de productos por sección (similar a `/buscar` con resultados)

---

## 2. Componentes de cards/productos

### `ProductCard` (`src/components/catalog/ProductCard.tsx`)
- **Tipo:** Client Component
- **Props:** `ProductCardProps` (id, section, product_slug, title, price_cents, image_url, in_stock, is_active, description, priority, sizes, compact, highlightQuery)
- **Características:**
  - Imagen con `ImageWithFallback`
  - Título con link a PDP (`/catalogo/[section]/[slug]`)
  - Precio formateado (`formatMXN`)
  - Badges: stock (pill-stock/pill-stock-out), envío gratis, puntos
  - `QuantityInput` (min 1, max 99)
  - Botón "Agregar al carrito" o "Elegir opciones" (si requiere selecciones)
  - Botón WhatsApp si agotado/sin precio
  - `hover-lift`, `tap-feedback`, `focus-premium`
  - Highlight del query si `highlightQuery` está presente
- **Usado por:**
  - `FeaturedGrid` → `ProductCard`
  - `SearchResultCard` → `ProductCard` (con `compact` y `highlightQuery`)
  - `RelatedProducts` (PDP) → `ProductCard`
  - Otros listados

### `SearchResultCard` (`src/components/SearchResultCard.tsx`)
- **Tipo:** Client Component
- **Props:** `CatalogItem`, `highlightQuery`, `position`
- **Función:** Wrapper que adapta `CatalogItem` → `ProductCardProps` y añade tracking de clicks
- **Renderiza:** `ProductCard` con `compact` y `highlightQuery`

### `FeaturedGrid` (`src/components/FeaturedGrid.tsx`)
- **Tipo:** Client Component
- **Props:** `items: FeaturedItem[]`, `source?`, `query?`, `cartItemsCount?`
- **Función:** Grid responsive (1/2/3/4 cols) que mapea `FeaturedItem` → `ProductCardProps` y renderiza `ProductCard`
- **Tracking:** `trackRelatedProductsShown` y `trackRelatedProductClicked`
- **Grid:** `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`

---

## 3. Componentes de búsqueda

### `SearchAutocomplete` (`src/components/search/SearchAutocomplete.client.tsx`)
- **Tipo:** Client Component
- **Props:** `placeholder`, `className`, `inputClassName`, `initialQuery`, `onSearch`, `context?: "header" | "page"`
- **Características:**
  - Input con icono Search y botones de voz/clear
  - Debounce 200ms para sugerencias
  - Fetch a `/api/search/suggest?q=...`
  - Dropdown con sugerencias (imagen, título, precio)
  - Helper "No sé qué buscar. Haz el quiz" solo si `context === "page"` y quiz habilitado
  - Keyboard navigation (ArrowDown/Up, Enter, Escape)
  - Click outside para cerrar
- **Usado por:**
  - `HeaderSearchBar` (desktop) → `context="header"`
  - `HeaderSearchMobile` (panel móvil) → `context="header"`
  - `QuickSearchBar` → sin `context` (default `"page"`)

### `QuickSearchBar` (`src/components/search/QuickSearchBar.tsx`)
- **Tipo:** Client Component
- **Props:** `initialQuery?`
- **Renderiza:**
  - `SearchAutocomplete` (sin `context` → `"page"`)
  - `RecentSearchChips` (búsquedas recientes)
  - Chips populares (hardcoded: guantes, brackets, resina, etc.)
- **Usado por:** `/tienda`, `/buscar` (con y sin query)

### `SearchInput` (`src/components/SearchInput.client.tsx`)
- **Tipo:** Client Component (dynamic import)
- **Función:** Input de búsqueda sticky usado en `/buscar` con resultados

---

## 4. Skeletons

### `ProductsGridSkeleton` (`src/components/products/ProductsGridSkeleton.tsx`)
- **Tipo:** Server Component
- **Props:** `count?` (default 8)
- **Renderiza:** Grid con `ProductCardSkeleton` repetido

### `ProductCardSkeleton` (`src/components/products/ProductCardSkeleton.tsx`)
- **Tipo:** Server Component
- **Función:** Skeleton individual de card (imagen, título, precio, botones)

### `SkeletonSearchItem` (`src/components/skeletons/SkeletonSearchItem.tsx`)
- **Tipo:** Server Component
- **Función:** Skeleton para items del dropdown de `SearchAutocomplete`

---

## 5. Flujos de datos (fetch)

### Productos destacados
- **Función:** `getFeaturedItems()` (`src/lib/catalog/getFeatured.server.ts`)
- **Fuente:** Supabase `featured` table → `api_catalog_with_images` view
- **Fallback:** Si no hay featured, últimos productos activos en stock
- **Retorna:** `FeaturedItem[]` (product_id, section, product_slug, title, price_cents, image_url, in_stock, is_active, etc.)

### Búsqueda
- **Endpoint:** `/api/products/search` (`src/app/api/products/search/route.ts`)
- **Fuente:** Supabase `api_catalog_with_images` view
- **Query:** `title.ilike.%q%`, `product_slug.ilike.%q%`, `section.ilike.%q%`
- **Filtros:** `is_active`, `in_stock` (opcional), rango de precio
- **Orden:** relevance (created_at desc), price_asc, price_desc, name_asc
- **Paginación:** `CATALOG_PAGE_SIZE` (default), offset/range
- **Retorna:** `{ items, total, page, perPage, hasNextPage }`

### Sugerencias de autocompletado
- **Endpoint:** `/api/search/suggest` (`src/app/api/search/suggest/route.ts`)
- **Fuente:** Supabase `api_catalog_with_images` view
- **Query:** Similar a búsqueda pero sin paginación (límite fijo)
- **Retorna:** `SuggestItem[]` (id, title, slug, section_slug, image_url, price_cents)

### Productos por sección
- **Función:** `getProductsBySectionFromView()` (`src/lib/catalog/getProductsBySectionFromView.server.ts`)
- **Fuente:** Supabase `api_catalog_with_images` view filtrado por `section`

---

## 6. Layout y header

### Header (`src/app/layout.tsx`)
- **Componentes:**
  - `TopInfoBar`
  - `HeaderWithScrollEffect` → nav con:
    - BrandMark (izquierda, shrink-0)
    - `HeaderSearchBar` (centro, flex-1 min-w-0 max-w-md min-w-[180px])
    - Links + `HeaderSearchMobile` + `ToothAccountMenu` (derecha, shrink-0)
- **Breakpoints:** Desktop search `hidden md:block`, mobile search `md:hidden`

### `HeaderSearchBar` (`src/components/header/HeaderSearchBar.client.tsx`)
- **Tipo:** Client Component
- **Renderiza:** `SearchAutocomplete` con `context="header"`

### `HeaderSearchMobile` (`src/components/header/HeaderSearchMobile.client.tsx`)
- **Tipo:** Client Component
- **Renderiza:** Panel overlay con `SearchAutocomplete` (`context="header"`), `RecentSearchChips`, chips populares

---

## 7. Puntos de extensión seguros (UI-only)

### Cards
- **`ProductCard`:** Clases CSS, spacing, hover/tap/focus, badges (pills), skeleton
- **`SearchResultCard`:** Wrapper, no lógica propia
- **`FeaturedGrid`:** Grid layout, gap, responsive cols

### Búsqueda
- **`SearchAutocomplete`:** Input styles, dropdown positioning, helper visibility (`context`), skeleton del dropdown
- **`QuickSearchBar`:** Container styles, chips layout

### Skeletons
- **`ProductCardSkeleton`:** Animación shimmer-silk, layout
- **`ProductsGridSkeleton`:** Grid layout, count

### Layout
- **`layout.tsx` nav:** Flex layout, spacing, breakpoints, contención (min-w-0, shrink-0)
- **Header components:** Clases CSS, no lógica de fetch/auth

### Páginas
- **`/tienda`, `/buscar`, `/destacados`:** Layout de secciones, spacing, empty states (UI), no cambiar fetch ni lógica

---

## 8. Archivos clave (resumen)

| Archivo | Tipo | Función |
|---------|------|---------|
| `src/app/tienda/page.tsx` | Server | Página tienda con destacados |
| `src/app/buscar/page.tsx` | Server | Página búsqueda con resultados |
| `src/app/destacados/page.tsx` | Server | Página solo destacados |
| `src/app/catalogo/[section]/page.tsx` | Server | Listado por sección |
| `src/components/catalog/ProductCard.tsx` | Client | Card canónica de producto |
| `src/components/SearchResultCard.tsx` | Client | Wrapper para resultados de búsqueda |
| `src/components/FeaturedGrid.tsx` | Client | Grid de productos destacados |
| `src/components/search/SearchAutocomplete.client.tsx` | Client | Autocompletado con dropdown |
| `src/components/search/QuickSearchBar.tsx` | Client | Barra de búsqueda con chips |
| `src/components/products/ProductsGridSkeleton.tsx` | Server | Grid de skeletons |
| `src/components/products/ProductCardSkeleton.tsx` | Server | Skeleton individual |
| `src/lib/catalog/getFeatured.server.ts` | Server | Fetch destacados |
| `src/app/api/products/search/route.ts` | API | Endpoint búsqueda |
| `src/app/api/search/suggest/route.ts` | API | Endpoint sugerencias |

---

## 9. Notas importantes

- **No cambiar:** Fetch logic, Supabase queries, API endpoints, auth, checkout/admin
- **Seguro cambiar:** Clases CSS, layout/spacing, hover/tap/focus, skeletons, empty states (UI), breakpoints
- **Componentes compartidos:** `ProductCard` es el componente canónico usado en todos los listados; cambios ahí afectan todos los lugares
- **Context pattern:** `SearchAutocomplete` usa `context="header"` vs `"page"` para controlar helper visibility
- **Tracking:** `FeaturedGrid` y `SearchResultCard` tienen tracking de analytics; no cambiar la lógica, solo UI
