# PR — FASE 3 / CARGA 5A: ProductCardV2 (opt-in) solo en /buscar (UI-only)

## Objetivo

Crear ProductCardV2 con look premium (menos ruido) y aplicarlo solo en /buscar para probar sin romper el resto de la tienda.

## Cambios

### Componente nuevo

- **`src/components/catalog/ProductCardV2.tsx`** (client)  
  - Acepta las mismas props que ProductCard (`ProductCardProps`).  
  - Estilo: título `line-clamp-2`, precio claro, stock discreto (pills stock/shipping/points), badges sutiles (stone/amber), imagen con borde/sombra suave (`border-stone-200/90`, `shadow-sm`), tap targets ≥ 44px.  
  - Misma lógica que ProductCard: addToCart, quantity, requiresSelections, highlight del query, WhatsApp; sin modificar endpoints ni stores.  
  - Fallback interno: si faltan `id`, `section` o `product_slug`, retorna `null` (no rompe).

### Archivos tocados

- **`src/components/SearchResultCard.tsx`**  
  - En /buscar usa ProductCardV2 cuando el item tiene datos mínimos (`id`, `section`, `product_slug`, `title`).  
  - Si falta algún dato (`hasMinDataForV2(item)` false), renderiza ProductCard canónica (fallback).  
  - Se mantiene highlight y tracking de clics (trackSearchClickResult).

### No modificado

- `src/components/catalog/ProductCard.tsx` (card canónica).  
- Endpoints, data fetching, props/shape de CatalogItem.  
- Checkout/cart stores, admin/shipping/pagos.  
- Sin dependencias nuevas.

## QA manual

### /buscar — Desktop (1440 / 1280)

1. Buscar con resultados: cards con look V2 (título line-clamp 2, precio claro, badges sutiles, imagen con borde/sombra).
2. Título largo: se trunca en 2 líneas.
3. Producto sin imagen (si existe): ImageWithFallback muestra fallback; card no se rompe.
4. Producto con variant/pack (requiere selecciones): botón "Elegir opciones" funciona igual; navega a PDP.
5. "Agregar" (producto comprable): sigue agregando al carrito igual que antes.

### /buscar — Móvil (390 / 360)

1. Cards V2 legibles; tap targets ≥ 44px (cantidad, Agregar, WhatsApp).
2. Sin overflow horizontal feo.

### Fallback

- Si el item no tiene `id`, `section`, `product_slug` o `title`, SearchResultCard renderiza ProductCard canónica (no V2).

## Confirmación

**UI-only.** No se modificó ProductCard canónica, endpoints, data fetching, ni stores. ProductCardV2 solo en /buscar (vía SearchResultCard).

## Validación

- `pnpm lint` (acepta warnings preexistentes).  
- `pnpm build` (exit 0).
