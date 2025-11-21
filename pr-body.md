Este PR implementa ordenamiento en el catálogo y búsqueda, preservando la paginación existente.

### Opciones de ordenamiento

- **`relevance`** (por defecto): Orden por fecha de creación (más recientes primero)
- **`price_asc`**: Precio de menor a mayor (columna `price_cents`)
- **`price_desc`**: Precio de mayor a menor (columna `price_cents`)
- **`name_asc`**: Nombre alfabético A-Z (columna `title`)

### Rutas afectadas

- `/catalogo/[section]`: Agregado `<select>` de ordenamiento arriba del grid
- `/buscar`: Agregado `<select>` de ordenamiento junto a los resultados

### Preservación de parámetros

- Al cambiar de página, se preserva `sort` en la URL
- En `/buscar`, se preservan `q`, `page` y `sort` simultáneamente
- Al cambiar el orden, `page` se resetea a `1` automáticamente

### Archivos modificados

- `src/lib/catalog/config.ts`: Agregado tipo `CatalogSortOption` y helper `normalizeSortParam`
- `src/lib/catalog/getBySection.server.ts`: Acepta `sort` y aplica `.order()` según opción
- `src/app/api/products/search/route.ts`: Lee `sort` de query params y aplica ordenamiento
- `src/components/catalog/SortSelect.client.tsx`: Nuevo componente client para UI de ordenamiento
- `src/app/catalogo/[section]/page.tsx`: Integra `SortSelect` y pasa `sort` a `getBySection`
- `src/app/buscar/page.tsx`: Integra `SortSelect` y pasa `sort` a API
- `src/components/catalog/Pagination.tsx`: Ya soportaba `extraQuery`, ahora recibe `sort`

### No se tocó

- Supabase Dashboard (solo queries con `.order()` en código)
- Lógica de puntos, checkout, Stripe
- Paginación existente (solo se preserva `sort` en URLs)

### QA técnico

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm build` ✅

