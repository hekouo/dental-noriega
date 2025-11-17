## Mejora de UX: Tarjeta de producto canónica y flujo "Comprar ahora"

### Objetivo

Unificar todas las tarjetas de producto en un componente canónico reutilizable y mejorar el flujo de "Agregar al carrito" + "Comprar ahora" desde la PDP.

### Cambios implementados

#### 1. Componente ProductCard canónico

**Nuevo archivo**: `src/components/catalog/ProductCard.tsx`

**Características**:
- ✅ Imagen con fallback usando `ImageWithFallback`
- ✅ Título con link a PDP (`/catalogo/{section}/{product_slug}`)
- ✅ Precio formateado en MXN
- ✅ Estado de stock (Agotado/Disponible)
- ✅ Stepper de cantidad (min 1, max 99, sin permitir 0 ni negativos)
- ✅ Botón "Agregar al carrito" con estado de carga
- ✅ Botón "Consultar por WhatsApp" si está agotado o sin precio
- ✅ Soporte para highlight de query (para búsqueda)
- ✅ Accesibilidad: `aria-label`, `aria-busy`, focus states, keyboard navigation
- ✅ Responsive: mobile-first con breakpoints de Tailwind

**Props**:
```typescript
type ProductCardProps = {
  id: string;
  section: string;
  product_slug: string;
  title: string;
  price_cents?: number | null;
  image_url?: string | null;
  in_stock?: boolean | null;
  is_active?: boolean | null;
  description?: string | null;
  priority?: boolean; // Para imágenes prioritarias
  sizes?: string; // Para responsive images
  compact?: boolean; // Modo compacto
  highlightQuery?: string; // Para búsqueda
};
```

#### 2. Reemplazo de tarjetas duplicadas

**Componentes actualizados**:
- ✅ `CatalogCard.tsx` → Ahora usa `ProductCard` internamente (wrapper para compatibilidad)
- ✅ `FeaturedCard.tsx` → Ahora usa `ProductCard` internamente (wrapper para compatibilidad)
- ✅ `SearchResultCard.tsx` → Ahora usa `ProductCard` con soporte para highlight
- ✅ `FeaturedGrid.tsx` → Usa `ProductCard` directamente
- ✅ `src/app/catalogo/[section]/page.tsx` → Usa `ProductCard` directamente

**Beneficios**:
- UX consistente en todas las vistas (Home, Destacados, Tienda, Búsqueda, Catálogo por sección)
- Mismo comportamiento de cantidad + agregar al carrito en todas partes
- Mantenimiento simplificado: cambios en un solo lugar
- Los wrappers mantienen compatibilidad con código existente

#### 3. Mejora del botón "Comprar ahora" en PDP

**Archivo**: `src/components/pdp/AddToCartControls.tsx`

**Mejoras**:
- ✅ Usa `useRouter` de Next.js para navegación (en lugar de `location.href`)
- ✅ Redirige a `/checkout/datos` (primer paso del checkout)
- ✅ Estado de carga mejorado (`isAdding`)
- ✅ Accesibilidad: `aria-label`, `aria-busy`, focus states
- ✅ Layout mejorado: botón "Comprar ahora" en línea separada, más prominente
- ✅ Analytics: tracking de `add_to_cart` antes de redirigir

**Flujo**:
1. Usuario selecciona cantidad
2. Click en "Comprar ahora"
3. Producto se agrega al carrito
4. Redirección automática a `/checkout/datos`

#### 4. Accesibilidad y responsividad

**Accesibilidad**:
- ✅ `aria-label` en todos los botones
- ✅ `aria-busy` durante operaciones asíncronas
- ✅ Focus states visibles (`focus-visible:ring-2`)
- ✅ Navegación por teclado funcional
- ✅ Contraste adecuado en todos los estados

**Responsividad**:
- ✅ Mobile-first: grid `grid-cols-2` en mobile, `md:grid-cols-4` en desktop
- ✅ Imágenes responsive con `sizes` apropiados
- ✅ Botones adaptativos al tamaño de pantalla
- ✅ Stepper de cantidad compacto en mobile

### Vistas actualizadas

1. **Home** (`/`) - Usa `FeaturedGrid` → `ProductCard`
2. **Destacados** (`/destacados`) - Usa `FeaturedGrid` → `ProductCard`
3. **Tienda** (`/tienda`) - Usa `FeaturedGrid` → `ProductCard`
4. **Búsqueda** (`/buscar`) - Usa `SearchResultCard` → `ProductCard` con highlight
5. **Catálogo por sección** (`/catalogo/[section]`) - Usa `ProductCard` directamente
6. **PDP** (`/catalogo/[section]/[slug]`) - Botón "Comprar ahora" mejorado

### Notas importantes

- ✅ **NO se modificó código de Supabase**: Solo cambios en frontend
- ✅ **NO se modificó código de Stripe**: Solo cambios en frontend
- ✅ **Compatibilidad mantenida**: Los wrappers (`CatalogCard`, `FeaturedCard`) mantienen la misma API
- ✅ **No se rompieron enlaces**: Todas las tarjetas navegan correctamente a PDP por `section/slug`

### Verificación técnica

- ✅ `pnpm typecheck`: Sin errores
- ✅ `pnpm lint`: Solo warnings de complejidad cognitiva preexistentes (no relacionados con estos cambios)
- ✅ `pnpm build`: Build exitoso

### Screenshots sugeridos para QA

1. **Home con productos**: Grid de productos destacados usando `ProductCard`
2. **Destacados** (`/destacados`): Lista de productos destacados
3. **Tienda** (`/tienda`): Grid de productos destacados + categorías
4. **Búsqueda** (`/buscar?q=...`): Resultados con highlight del query
5. **Catálogo por sección** (`/catalogo/[section]`): Grid de productos de la sección
6. **PDP** (`/catalogo/[section]/[slug]`): Botón "Comprar ahora" prominente

### Próximos pasos sugeridos (fuera del alcance de este PR)

- Agregar tests unitarios para `ProductCard` con Vitest/React Testing Library
- Considerar eliminar wrappers (`CatalogCard`, `FeaturedCard`) en una futura refactorización
- Agregar animaciones sutiles de hover/transición si se desea mejorar aún más la UX

