# PR: Global UI consistency (badges, focus, hover/tap)

**Branch:** `ui/global-ui-consistency`  
**Objetivo:** Unificar apariencia premium “Heritage dental” en badges/pills, focus states y microinteracciones usando utilidades existentes (hover-lift, tap-feedback, focus-premium, shimmer-silk). Solo UI; sin tocar lógica de negocio.

---

## Alcance

- **Pills/badges:** Estilos reutilizables en `globals.css` (`.pill`, `.pill-heritage`, `.pill-stock`, `.pill-stock-out`, `.pill-shipping`, `.pill-points`, `.pill-neutral`) y reemplazo de estilos dispersos en product cards, PDP y componentes públicos.
- **Focus:** `.focus-premium` aplicado a inputs de búsqueda (SearchAutocomplete, HeaderSearchMobile chips), enlaces/CTAs principales públicos y botones de cards.
- **Hover/Tap:** `.hover-lift` y `.tap-feedback` en ProductCard (contenedor y CTAs), RelatedProducts, FeaturedCardControls, CatalogCardControls, TrustBadges (heritage), LoyaltyHeaderBadge.
- **Skeleton:** `.shimmer-silk` en SkeletonProductCard y ProductCardSkeleton para reemplazar grises duros/animación genérica.

**No se tocó:** checkout flow, admin, endpoints, Supabase/Stripe/Skydropx, rutas, contratos.

---

## Archivos tocados

| Archivo | Cambios |
|---------|---------|
| `src/app/globals.css` | Clases `.pill` y variantes en `@layer components`. |
| `src/components/catalog/ProductCard.tsx` | Pills (stock, shipping, points), hover-lift/tap-feedback en card, focus-premium/tap-feedback en CTA y WhatsApp. |
| `src/app/catalogo/[section]/[slug]/page.tsx` | Badge de stock PDP reemplazado por pill-stock / pill-stock-out. |
| `src/components/search/SearchAutocomplete.client.tsx` | focus-premium en input y botones (voz, clear). |
| `src/components/header/HeaderSearchMobile.client.tsx` | focus-premium y tap-feedback en chips de búsqueda. |
| `src/components/header/LoyaltyHeaderBadge.tsx` | pill pill-points, focus-premium, tap-feedback. |
| `src/components/pdp/RelatedProducts.tsx` | focus-premium y tap-feedback en enlaces/CTAs. |
| `src/components/ui/TrustBadges.tsx` | Variante heritage con pill-heritage y focus-premium/tap-feedback en enlaces. |
| `src/components/FeaturedCardControls.tsx` | focus-premium y tap-feedback en botones CTA. |
| `src/components/CatalogCardControls.tsx` | focus-premium y tap-feedback en botón CTA. |
| `src/components/skeletons/SkeletonProductCard.tsx` | shimmer-silk en bloques de skeleton (respetando reduced motion). |
| `src/components/products/ProductCardSkeleton.tsx` | shimmer-silk en bloques de skeleton. |
| `docs/PR-global-ui-consistency.md` | Este documento. |

---

## QA manual obligatorio

### Desktop y mobile

1. **/tienda**  
   - Cards con badges (stock, envío, puntos) en estilo pill discreto.  
   - Hover en card: ligero lift y sombra.  
   - Tap en card/botón: feedback scale.  
   - Sin overflow horizontal.

2. **/destacados**  
   - Cards coherentes con /tienda (mismas pills y hover/tap).

3. **/buscar**  
   - Input de búsqueda: focus ring premium (bronce/neutral).  
   - Botón clear (si existe) y voz con focus premium.  
   - Resultados con mismas pills y microinteracciones.

4. **2 PDPs con títulos largos**  
   - Badge de stock (En stock / Agotado) como pill.  
   - CTA principal y secundarios con focus y tap consistentes.

### Accesibilidad

- **prefers-reduced-motion:** Con “Reducir movimiento” activado, no debe forzarse animación (hover-lift/tap-feedback/shimmer se desactivan vía globals.css).  
- Verificar que focus-premium es visible en teclado (focus-visible).

### Confirmación explícita

- **No se tocó lógica de checkout, admin, shipping ni pagos.**  
- Solo cambios de clases CSS y componentes de presentación en rutas públicas.

---

## Validación

```bash
pnpm lint
pnpm build
```
