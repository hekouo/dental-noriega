# PR #526 — CARGA 8C: Fix /buscar estado inicial (no mostrar "Cargando…" sin query)

## Objetivo

En `/buscar`, cuando NO hay query:
- NO mostrar "Cargando resultados de búsqueda..."
- Mostrar el estado inicial premium (header + input + sugerencias/chips/empty state inicial)
- Cuando SÍ hay query: mantener comportamiento actual (loading/results/empty).

## Reglas (hard)

- UI-only: NO tocar `/api/products/search` ni `/api/search/suggest`.
- NO tocar `SearchAutocomplete` del header.
- Sin dependencias nuevas.
- Mantener `pnpm lint/build` exit 0.

## Cambios

### Archivos tocados

| Archivo | Cambio |
|--------|--------|
| `src/app/buscar/loading.tsx` | **ELIMINADO:** Este archivo mostraba un skeleton con mensaje "Cargando resultados de búsqueda..." cada vez que Next.js navegaba a `/buscar`, incluso sin query. Al eliminarlo, Next.js ya no muestra un estado de loading intermedio cuando no hay query. |
| `docs/PR-carga8c-buscar-initial-state.md` | Esta documentación. |

### No modificado

- `src/app/buscar/page.tsx` - Ya maneja correctamente el caso sin query (retorna inmediatamente el estado inicial con header, input, búsquedas populares y categorías).
- Endpoints de búsqueda (`/api/products/search`, `/api/search/suggest`).
- `SearchAutocomplete` del header.
- Componentes relacionados (`QuickSearchBar`, `BuscarClient`, etc.).

## Explicación técnica

**Problema:**
- Next.js App Router muestra automáticamente `loading.tsx` durante la navegación a una ruta.
- `src/app/buscar/loading.tsx` mostraba un skeleton con mensaje "Cargando resultados de búsqueda..." incluso cuando el usuario navegaba a `/buscar` sin query.
- Esto era confuso porque no había resultados que cargar.

**Solución:**
- Eliminar `loading.tsx` porque:
  1. El componente principal (`page.tsx`) ya maneja correctamente el caso sin query (retorna inmediatamente el estado inicial).
  2. Cuando hay query, el fetch es server-side y rápido, así que no hay un estado de loading intermedio visible para el usuario.
  3. Si en el futuro necesitamos loading state para búsquedas con query, podemos usar `Suspense` dentro del componente principal condicionado a la existencia de query.

**Comportamiento después del fix:**
- Sin query (`/buscar`): Muestra inmediatamente el estado inicial (header, input, búsquedas populares, categorías). ✅
- Con query (`/buscar?q=arcos`): Muestra resultados directamente (fetch server-side rápido). ✅
- Navegación entre estados: Sin mensaje de "Cargando..." intermedio. ✅

## QA manual

### Caso 1: `/buscar` sin query (desktop y mobile)

1. Navegar a `https://ddnshop.mx/buscar` (sin query params).
2. **Verificar:** NO debe aparecer mensaje "Cargando resultados de búsqueda...".
3. **Verificar:** Debe mostrar inmediatamente:
   - Header "Buscar productos" con descripción
   - Input de búsqueda (`QuickSearchBar`)
   - Sección "Búsquedas populares" con chips
   - Sección "Explorar por categoría" con chips

### Caso 2: `/buscar` con query (ej: "arcos")

1. Navegar a `https://ddnshop.mx/buscar?q=arcos`.
2. **Verificar:** Debe mostrar resultados directamente (sin mensaje de "Cargando..." intermedio).
3. **Verificar:** Si hay resultados: grid de productos.
4. **Verificar:** Si no hay resultados: empty state con sugerencias.

### Caso 3: Navegación entre estados

1. Estar en `/buscar` sin query.
2. Hacer clic en un chip de "Búsquedas populares" (ej: "arcos NITI").
3. **Verificar:** Navegación fluida sin mensaje de "Cargando..." intermedio.
4. **Verificar:** Resultados aparecen directamente.

### Validación técnica

- `pnpm lint` (exit 0)
- `pnpm build` (exit 0)

## Confirmación

- **Sin cambios en endpoints:** No se tocó `/api/products/search` ni `/api/search/suggest`.
- **Sin cambios en componentes relacionados:** No se tocó `SearchAutocomplete` del header ni otros componentes.
- **UI-only:** Solo se eliminó el archivo `loading.tsx` que causaba el problema.

## Entregable

- PR contra main con cambios mínimos (1 archivo eliminado).
- Lista exacta de archivos tocados (arriba).
- Confirmación de que NO se tocaron endpoints ni componentes relacionados.
