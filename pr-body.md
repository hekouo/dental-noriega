Este PR añade breadcrumbs (migas de pan) reutilizables en el catálogo y PDP para mejorar la navegación.

### Cambios principales

1. **Nuevo componente `Breadcrumbs`:**
   - Creado en `src/components/navigation/Breadcrumbs.tsx`
   - Componente reutilizable con props `items: Crumb[]` y `className?: string`
   - Usa estructura semántica `<nav aria-label="Breadcrumb"><ol><li>...</li></ol>` para accesibilidad
   - Último item no es link (solo texto con `font-medium`)
   - Separadores con `/` usando `text-gray-300`

2. **Breadcrumbs en `/catalogo`:**
   - Estructura: `Inicio > Catálogo`
   - Ubicación: arriba del título principal, dentro del hero con fondo gradient

3. **Breadcrumbs en `/catalogo/[section]`:**
   - Estructura: `Inicio > Catálogo > {sectionLabel}`
   - Reemplaza el link "← Volver al catálogo"
   - Usa `ROUTES.section()` para la URL de la sección
   - `sectionLabel` se formatea igual que el título (reemplaza `-` por espacios y capitaliza)

4. **Breadcrumbs en `/catalogo/[section]/[slug]` (PDP):**
   - Estructura: `Inicio > Catálogo > {sectionLabel} > {productTitle}`
   - Reemplaza el breadcrumb anterior (que usaba estructura manual)
   - Usa `ROUTES.section()` y `ROUTES.product()` para URLs
   - Mantiene el mismo diseño visual (barra blanca con border-b)

### Archivos modificados

- `src/components/navigation/Breadcrumbs.tsx` (nuevo):
  - Componente reutilizable con TypeScript estricto
  - Props tipadas: `Crumb = { href?: string; label: string }`
  - Accesibilidad: `aria-label="Breadcrumb"`, estructura semántica
  - Estilos: `flex flex-wrap items-center gap-1 text-sm text-gray-500`
  - Links con hover: `hover:text-gray-900 transition-colors`
  - Último item: `font-medium text-gray-900`

- `src/app/catalogo/page.tsx`:
  - Agregado import de `Breadcrumbs`
  - Breadcrumbs arriba del título en el hero

- `src/app/catalogo/[section]/page.tsx`:
  - Agregado import de `Breadcrumbs`
  - Reemplazado link "← Volver al catálogo" por breadcrumbs
  - Usa `ROUTES.home()`, `ROUTES.catalogIndex()`, `ROUTES.section()`

- `src/app/catalogo/[section]/[slug]/page.tsx`:
  - Agregado import de `Breadcrumbs`
  - Reemplazado breadcrumb manual anterior por componente `Breadcrumbs`
  - Usa `ROUTES.home()`, `ROUTES.catalogIndex()`, `ROUTES.section()`, `ROUTES.product()`

### Estructura visual

**En `/catalogo`:**
```
Inicio / Catálogo
Catálogo Completo
```

**En `/catalogo/[section]`:**
```
Inicio / Catálogo / Instrumental Ortodoncia
Instrumental Ortodoncia
```

**En `/catalogo/[section]/[slug]`:**
```
Inicio / Catálogo / Instrumental Ortodoncia / Arcos Rectangulares
[Imagen] | Título del producto
```

### Accesibilidad

- Uso de `<nav aria-label="Breadcrumb">` para screen readers
- Estructura semántica con `<ol><li>` para listas ordenadas
- Links con focus states: `focus:outline-none focus-visible:ring-2`
- Separadores con `aria-hidden="true"` para evitar ruido en screen readers

### Rutas utilizadas

- `ROUTES.home()` → `/`
- `ROUTES.catalogIndex()` → `/catalogo`
- `ROUTES.section(sectionSlug)` → `/catalogo/${sectionSlug}`
- `ROUTES.product(sectionSlug, productSlug)` → `/catalogo/${sectionSlug}/${productSlug}`

### No se tocó

- Backend (Supabase/Stripe)
- Lógica de negocio
- APIs de catálogo o búsqueda
- Estilos de otras páginas (solo catálogo y PDP)

### QA técnico

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm build` ✅

