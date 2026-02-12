# PR — FASE 3 / CARGA 4: /buscar premium (header + input grande + empty/chips) UI-only

## Objetivo

Hacer /buscar muy notorio sin tocar lógica:

1. Header editorial arriba (título + subtítulo cuando no hay query; StorefrontListHeader con contador cuando hay resultados).
2. Input en bloque premium (rounded-xl, borde stone, fondo suave).
3. EmptyState cuando no hay resultados + chips de búsqueda (guantes, brackets, arcos, resina, etc.) que escriben el query vía Link a `/buscar?q=...`.
4. Resultados con spacing mejorado (gap-5/gap-6, bordes stone).
5. Se mantienen SearchInput y QuickSearchBar existentes; no se toca el motor ni las APIs.

## Cambios

### Archivo tocado

- **`src/app/buscar/page.tsx`**
  - **Sin query:** Header editorial (h1 "Buscar productos" + subtítulo), input en bloque premium (wrapper rounded-xl border-stone bg-stone-50/50), búsquedas populares y categorías con `focus-premium tap-feedback min-h-[44px]` y spacing `space-y-8`.
  - **Con query:** StorefrontListHeader (título + contador "N productos" cuando `total > 0`) + SearchInput dentro del mismo bloque premium; grid de resultados con `gap-5 sm:gap-6` y `mt-2`; EmptyState con chips (incl. "arcos") y CTAs; sección destacados con borde stone; "También te puede interesar" con borde stone.
  - Contador: solo cuando `total > 0` (viene de la respuesta existente); no se inventa.

### No modificado

- Header global, SearchAutocomplete del header.
- `/api/products/search`, `/api/search/suggest`.
- Stores de checkout/cart.
- Sin dependencias nuevas.

## QA manual

### /buscar — Desktop (1440 / 1280)

1. Ir a `/buscar` sin query: header "Buscar productos" + subtítulo; input en bloque premium (fondo suave, borde redondeado); búsquedas populares y categorías con buen spacing.
2. Buscar "xyz" (sin resultados): EmptyState "No encontramos eso" con chips (guantes, brackets, arcos, etc.); al hacer clic en un chip se navega a `/buscar?q=...` (query seteado).
3. Buscar "guantes" (con resultados): StorefrontListHeader con "Resultados para \"guantes\"" y contador "N productos"; input en bloque premium; grid con spacing mejorado; paginación y filtros sin cambios.

### /buscar — Móvil (390 / 360)

1. Sin query: header e input en bloque premium legibles; chips con tap targets ≥ 44px.
2. Con/sin resultados: sin overflow horizontal feo; swipe en chips si aplica.

## Confirmación

**UI-only.** Sin cambios de lógica, datos ni endpoints. No se tocaron header global, APIs de búsqueda ni stores.

## Validación

- `pnpm lint` (acepta warnings preexistentes).
- `pnpm build` (exit 0).
