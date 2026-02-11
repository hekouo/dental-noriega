# Hotfix: Header search layout (UI-only)

**Branch:** `ui/header-search-fix`  
**Objetivo:** Corregir el layout del buscador en header: bloque angosto con "No sé qué buscar. Haz el quiz" apilado raro en desktop (ddnshop.mx). Solo UI; cero lógica.

---

## Cambios

- **SearchAutocomplete:**
  - Wrapper y contenedor del input: `w-full min-w-0` para contención y evitar texto en columna.
  - Dropdown: añadido `left-0 right-0 top-full` para posicionarlo fuera del flujo, debajo del input y ancho completo; `min-w-0` en el dropdown.
  - Nuevo prop `showQuizLink` (default `true`): en header se pasa `false` para no mostrar el enlace "No sé qué buscar. Haz el quiz" debajo del input (evita el bloque angosto en el nav).
  - Quiz link cuando se muestra: `whitespace-nowrap` para evitar salto de línea.
- **HeaderSearchBar:** `showQuizLink={false}`; contenedor con `w-full max-w-md min-w-0 flex-1`.
- **HeaderSearchMobile:** `showQuizLink={false}`; contenedor del input `w-full min-w-0`.
- **layout.tsx:** Contenedor del buscador desktop: `w-full` además de `flex-1 max-w-md min-w-0`.

Breakpoints (sin cambios): desktop search `hidden md:block`; botón y panel móvil `md:hidden`.

---

## QA manual

- **Home, desktop 1440/1280:** Header con buscador en línea; sin bloque "No sé qué buscar" debajo; dropdown de sugerencias debajo del input, ancho completo.
- **Mobile 390/360:** Botón Buscar visible; al abrir, overlay y panel ok; tap targets ≥44px; input y resultados sin layout raro.
- **Página /buscar:** Input y resultados normales; si quiz está activo, "No sé qué buscar. Haz el quiz" visible donde corresponda.

**Confirmación:** No se tocó lógica de checkout/admin/shipping/pagos/endpoints.
