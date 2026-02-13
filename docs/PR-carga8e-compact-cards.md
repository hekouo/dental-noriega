# PR #528 — CARGA 8E: Product cards compactas en /tienda y /destacados (FeaturedGrid context) UI-only

## Objetivo

En /tienda y /destacados las cards seguían demasiado altas. Causas principales: CTAs grandes (especialmente WhatsApp) + padding/imagen que inflan la altura. Objetivo: “grid retail” compacto sin perder tap targets ni romper lógica.

## Reglas (hard)

- UI-only: NO tocar endpoints, NO tocar lógica de carrito/checkout/admin/shipping/pagos.
- NO cambiar data fetching ni props de datos.
- Sin dependencias nuevas.
- Tap targets >= 44px (principal). Secundarios accesibles.

## Cambios

### 1. ProductCard (`src/components/catalog/ProductCard.tsx`)

- **Prop `variant`:** `variant?: "default" | "compact"`. Default = comportamiento actual; compact = usado en FeaturedGrid.
- **Compact:**
  - Imagen: `aspect-[4/3]` mantenido; `max-h-[180px] sm:max-h-[210px]` (antes 220/260).
  - Card: `p-3` (sin p-4 en sm).
  - Controles: `pt-2` en lugar de pt-3.
  - WhatsApp: link secundario outline/ghost (borde gris, texto gris, min-h 44px) en lugar de botón verde grande. Misma URL y tracking.
- Sin cambios de lógica (addToCart, requiresSelections, trackWhatsappClick, etc.).

### 2. ProductCardV2 (`src/components/catalog/ProductCardV2.tsx`)

- **Prop `variant`:** mismo tipo; `variant = "default"`.
- **Compact:** misma lógica: imagen max-h 180/210, contenido p-3, pt-2 en controles, WhatsApp como link outline.
- Sin cambios de lógica.

### 3. FeaturedGrid (`src/components/FeaturedGrid.tsx`)

- Pasa `variant="compact"` a ProductCard y ProductCardV2 al renderizar el grid vertical.
- ProductRail no tocado.

## Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/components/catalog/ProductCard.tsx` | Prop `variant`, estilos compact (imagen, padding, WhatsApp outline). |
| `src/components/catalog/ProductCardV2.tsx` | Prop `variant`, estilos compact. |
| `src/components/FeaturedGrid.tsx` | Pasa `variant="compact"` a ambas cards. |
| `docs/PR-carga8e-compact-cards.md` | Esta documentación. |

## QA manual

- **/tienda** (desktop 1440/1280 y móvil 390): cards más bajas; WhatsApp como link secundario; botón principal “Agregar” / “Elegir opciones” full-width y min-h 44px.
- **/destacados** (desktop y móvil): mismo grid compacto.
- **Antes/después:** menor altura por card; sin overflow horizontal; WhatsApp sigue abriendo el mismo enlace y tracking.

## Validación

- `pnpm lint` (exit 0)
- `pnpm build` (exit 0)

## Confirmación

- Solo estilos (no lógica). WhatsApp sigue funcionando (misma URL, mismo onClick/trackWhatsappClick).
- PDP y otros usos de ProductCard/ProductCardV2 sin variant siguen igual (default).
