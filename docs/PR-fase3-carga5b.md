# PR — FASE 3 / CARGA 5B: ProductCardV2 en FeaturedGrid (tienda + destacados) con flag y fallback

## Objetivo

Usar ProductCardV2 en /tienda y /destacados solo a través de FeaturedGrid, con un flag para apagarlo rápido si algo sale mal.

## Cambios

### Archivo tocado

- **`src/components/FeaturedGrid.tsx`**
  - Flag: `NEXT_PUBLIC_FEATURE_CARD_V2` (env var, default false). Si `"true"`, FeaturedGrid renderiza ProductCardV2 cuando el item tiene datos mínimos; si no, ProductCard canónica.
  - Helper `hasMinDataForFeaturedV2(item)`: comprueba `product_id`, `section`, `product_slug`, `title`. Si falta algo, se usa ProductCard (fallback automático).
  - No hay “null renders”: siempre se renderiza ProductCard o ProductCardV2; nunca se deja un hueco.

### No modificado

- `src/components/catalog/ProductCard.tsx`.
- Endpoints, fetch, stores, checkout/admin/shipping/pagos.
- Sin dependencias nuevas.

## QA manual

### /tienda (1440 y 390)

- Con flag **off** (default): se ven ProductCard canónicas en “Productos destacados”.
- Con flag **on** (`NEXT_PUBLIC_FEATURE_CARD_V2=true` en Vercel): se ven ProductCardV2 en el mismo grid; títulos largos con line-clamp 2; productos sin imagen (si existen) con fallback; sin huecos.

### /destacados (1440 y 390)

- Mismo comportamiento: con flag on, grid de destacados usa V2; con flag off, ProductCard canónica.

### PDP relacionado (si muestra grid)

- Si la sección “Productos relacionados” usa FeaturedGrid u otro componente que no sea FeaturedGrid, no cambia en este PR. Si en algún lugar se usa FeaturedGrid para relacionados, aplicar la misma QA (flag on/off, sin huecos).

## Confirmación

**UI-only.** No se modificó ProductCard canónica, endpoints, fetch ni stores. ProductCardV2 en /tienda y /destacados solo vía FeaturedGrid y solo cuando el flag está on y el item tiene datos mínimos; en caso contrario, fallback a ProductCard.

## Validación

- `pnpm lint` (acepta warnings preexistentes).
- `pnpm build` (exit 0).
- Vercel preview: revisar /tienda y /destacados en 1440 y 390 (con y sin flag si se configura en Vercel).
