# PR #527 — CARGA 8D: Fix cards gigantes en /tienda y /destacados (FeaturedGrid + constraints) UI-only

## Objetivo

En `/tienda` y `/destacados` las cards se veían enormes (tipo PDP), no cabían bien en pantalla. Objetivo: cards más compactas + grid con columnas correctas. Visual premium, no "poster".

## Reglas (hard)

- UI-only: NO tocar endpoints, NO tocar lógica de carrito/checkout/admin/shipping/pagos.
- NO cambiar rutas ni data fetching.
- Sin dependencias nuevas.
- Mantener tap targets ≥ 44px y focus-premium.
- No romper rails (ProductRail) ni el scroll horizontal.

## Diagnóstico (código)

- **/tienda** y **/destacados** usan `FeaturedGrid` para el grid vertical. ✅
- **FeaturedGrid** usa `ProductCard` o `ProductCardV2` según flag `NEXT_PUBLIC_FEATURE_CARD_V2` (ON → V2, OFF → ProductCard). ✅
- Problema: grid con `md:grid-cols-3 lg:grid-cols-4` hacía celdas muy anchas en viewports intermedios; imagen `aspect-square` sin límite de altura hacía bloques muy altos.

## Cambios

### 1. FeaturedGrid (`src/components/FeaturedGrid.tsx`)

- **Grid:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (antes: `md:grid-cols-3 lg:grid-cols-4`).
  - base: 1 columna.
  - sm: 2 columnas.
  - lg: 3 columnas.
  - xl: 4 columnas.
- **Spacing:** `gap-4 md:gap-5` (gap moderado).
- **Alineación:** `items-start` para evitar stretch vertical raro.
- **Container:** Sin cambio de max-width; el contenedor padre (`max-w-7xl`) se mantiene.

### 2. ProductCard (`src/components/catalog/ProductCard.tsx`)

- **Imagen:** Ratio `aspect-[4/3]` y altura máxima `max-h-[220px] sm:max-h-[260px]` en el wrapper de la imagen para evitar bloques gigantes.
- **Card:** `rounded-xl` (antes `rounded-2xl`), `p-3 sm:p-4` (padding más compacto en mobile).
- Sin cambios de lógica (addToCart, requiresSelections, WhatsApp, etc.).

### 3. ProductCardV2 (`src/components/catalog/ProductCardV2.tsx`)

- **Imagen:** Mismo ratio y techo de altura: `aspect-[4/3] max-h-[220px] sm:max-h-[260px]`.
- **Card:** `p-3 sm:p-4` en el bloque de contenido.
- Sin cambios de lógica.

## Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/components/FeaturedGrid.tsx` | Grid: breakpoints lg/xl, gap, items-start. |
| `src/components/catalog/ProductCard.tsx` | Imagen: aspect 4/3 + max-h; card: rounded-xl, p-3 sm:p-4. |
| `src/components/catalog/ProductCardV2.tsx` | Imagen: aspect 4/3 + max-h; contenido: p-3 sm:p-4. |
| `docs/PR-carga8d-featuredgrid-card-sizing.md` | Esta documentación. |

## Compatibilidad con flag

- **NEXT_PUBLIC_FEATURE_CARD_V2 = true:** FeaturedGrid usa ProductCardV2; ambas cards comparten criterios de tamaño (aspect 4/3, max-h, padding).
- **NEXT_PUBLIC_FEATURE_CARD_V2 = false:** FeaturedGrid usa ProductCard; mismo criterio compacto.
- Sin layout shift relevante entre una y otra; mismo número de columnas y gap.

## QA manual (obligatorio)

- **/tienda** 1440px y 1280px: 3–4 cards por fila, sin aspecto de poster.
- **/destacados** 1440px y 1280px: mismo grid compacto.
- **Móvil** 390px / 360px: 1 columna, card con altura razonable (sin altura exagerada).
- Sin overflow horizontal (rails y grid dentro del viewport).

## Validación

- `pnpm lint` (exit 0)
- `pnpm build` (exit 0)

## Confirmación

- Solo clases/layout. Sin cambios de lógica ni endpoints.
- ProductRail no tocado; scroll horizontal intacto.
- Tap targets ≥ 44px y focus-premium mantenidos.
