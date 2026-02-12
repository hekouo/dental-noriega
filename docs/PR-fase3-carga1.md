# PR — FASE 3 / CARGA 1: Storefront shared UI components

## Objetivo

Crear dos componentes reutilizables para `/tienda` y `/buscar` sin cambiar lógica:

1. **StorefrontListHeader**: título, subtítulo, contador opcional, acciones opcionales.
2. **EmptyState**: ícono opcional, título, descripción, CTA/contenido adicional opcional.

Estilo Heritage (marfil/bronce/neutros), consistente con pills, `focus-premium` y `tap-feedback` existentes.

## Cambios

### Archivos nuevos

- `src/components/storefront/StorefrontListHeader.tsx`  
  - Props: `title`, `subtitle?`, `counter?`, `actions?`, `level?` (1 | 2), `className?`.  
  - Contador mostrado como `pill-neutral`; encabezado con `tracking-tight`, `text-stone-600` para subtítulo.

- `src/components/storefront/EmptyState.tsx`  
  - Props: `title`, `description?`, `icon?`, `children?`, `className?`, `role?`, `aria-live?`.  
  - Contenedor con `border-stone-200/90`, ícono en contenedor `amber-50/90` + `border-amber-200/70`.

### Archivos tocados

- `src/app/tienda/page.tsx`  
  - Sección “Productos destacados”: uso de `StorefrontListHeader` (título + subtítulo).  
  - Empty state “No hay productos para mostrar”: uso de `EmptyState` con icono, título, descripción y children (chips + CTAs).  
  - Enlaces con `focus-premium tap-feedback min-h-[44px]`.

- `src/app/buscar/page.tsx`  
  - Cabecera de resultados: uso de `StorefrontListHeader` (título + `counter` “N productos”).  
  - Empty state “No encontramos eso”: uso de `EmptyState` con icono, título, descripción y children (sugerencias, chips, CTAs).  
  - Enlaces con `focus-premium tap-feedback min-h-[44px]`.

### No modificado

- Endpoints (`/api/products/search`, `/api/search/suggest`).
- `ProductCard`, `FeaturedGrid`, header global, layout.
- Checkout, admin, shipping, pagos.
- Sin dependencias nuevas.

## Requisitos UI cumplidos

- Botones/targets: `min-h-[44px]` en CTAs y chips que actúan como botón.
- `focus-premium` y `tap-feedback` en enlaces de empty state y sugerencias.
- Responsive: 1440/1280 y 390/360 (clases `sm:`, `text-xl sm:text-2xl`, etc.).
- Fallback visual: componentes con props opcionales y sin lógica que pueda fallar; mismo contenido que antes, solo reemplazo de markup.

## QA manual

### /tienda

1. **Desktop (1440 / 1280)**  
   - Ir a `/tienda`.  
   - Comprobar hero y sección “Productos destacados”: título “Productos destacados” y subtítulo con tipografía/clases heritage.  
   - Si no hay destacados: bloque vacío con ícono, “No hay productos para mostrar”, descripción, chips de sugerencias y CTAs “Ir a buscar” / “Preguntar por WhatsApp”.  
   - Enlaces y chips con foco visible (focus-premium) y tap (tap-feedback). Altura mínima de botones/CTAs ~44px.

2. **Móvil (390 / 360)**  
   - Mismo flujo en viewport estrecho.  
   - Header y empty state legibles y sin cortes; CTAs apilados o en fila según diseño.

### /buscar

1. **Desktop (1440 / 1280)**  
   - Ir a `/buscar?q=xyz` (sin resultados): empty state “No encontramos eso” con ícono, descripción, sugerencias, chips y CTAs (Quitar filtros, Ver destacados, WhatsApp).  
   - Ir a `/buscar?q=guantes` (con resultados): cabecera con título “Resultados para ‘guantes’” y contador “N productos” en pill.  
   - Comprobar `SearchInput` debajo del header.  
   - Enlaces/chips con focus-premium y tap-feedback; altura mínima ~44px.

2. **Móvil (390 / 360)**  
   - Mismo flujo: empty state y cabecera con resultados correctos y usables en pantalla pequeña.

### Confirmación

- **Solo UI**: sin cambios de lógica, datos ni endpoints.  
- Comportamiento de navegación, búsqueda y filtros igual que antes.

## Validación

- `pnpm lint`: acepta warnings preexistentes; no añadir errores.
- `pnpm build`: debe pasar.

## Criterio de éxito

- PR acotado: dos componentes nuevos + integración mínima en `/tienda` y `/buscar`.
- Componentes listos para reutilizar en CARGA 2+.
- Cambios visuales leves/positivos (header y empty state unificados en estilo Heritage), sin romper flujos existentes.
